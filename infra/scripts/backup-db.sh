#!/bin/bash

set -euo pipefail

# Load environment variables from .env if it exists
if [ -f "/opt/skylux/.env" ]; then
  # shellcheck disable=SC1091
  . /opt/skylux/.env
elif [ -f "./.env" ]; then
  # shellcheck disable=SC1091
  . ./.env
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/skylux/backups}"
PREFIX="${1:-${BACKUP_PREFIX:-skylux_backup}}"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="${PREFIX}_${DATE}.sql.gz"

DB_CONTAINER="skylux-postgres"
DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
: "${DB_PASSWORD:?DB_PASSWORD must be set in /opt/skylux/.env}"

mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo "Starting database backup snapshot..."
echo "Database:  $DB_NAME"
echo "Container: $DB_CONTAINER"
echo "Output:    $BACKUP_DIR/$FILE_NAME"
echo "=========================================================="

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "✖ ERROR: PostgreSQL container '${DB_CONTAINER}' is not running!"
  exit 1
fi

# Execute pg_dump and compress with gzip
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  | gzip > "$BACKUP_DIR/$FILE_NAME"

# Verify backup integrity (must exist and be non-empty)
if [ ! -s "$BACKUP_DIR/$FILE_NAME" ] || ! gzip -t "$BACKUP_DIR/$FILE_NAME"; then
  echo "✖ ERROR: Database backup failed! File is empty or was not created."
  rm -f "$BACKUP_DIR/$FILE_NAME" 2>/dev/null || true
  exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_DIR/$FILE_NAME" | cut -f1)
echo "✔ Backup verified successfully! Size: $FILE_SIZE"
echo "LATEST_BACKUP_FILE=$BACKUP_DIR/$FILE_NAME"

# Database dumps remain on the VPS for now. Cloudinary credentials are only
# used by the application media adapter and are intentionally not read here.
OFFSITE_BACKUP_REQUIRED="${OFFSITE_BACKUP_REQUIRED:-false}"
BACKUP_OPERATION_FAILED=0
if [[ "$OFFSITE_BACKUP_REQUIRED" == "true" || "$OFFSITE_BACKUP_REQUIRED" == "1" ]]; then
  echo "Off-site backup is marked required, but no private off-site destination is configured."
  echo "The verified local backup remains at: $BACKUP_DIR/$FILE_NAME"
  BACKUP_OPERATION_FAILED=1
else
  echo "ℹ Off-site backup is deferred. Keeping the verified local copy on the VPS."
fi

# Xoay vòng bản sao lưu: Tự động xóa các bản cũ hơn 7 ngày để tránh đầy ổ cứng
echo "Checking retention policy (pruning backups older than 7 days)..."
find "$BACKUP_DIR" -type f \( -name "skylux_backup_*.sql.gz" -o -name "skylux_pre_deploy_*.sql.gz" \) -mtime +7 -delete 2>/dev/null || true
echo "✔ Backup retention check completed."
if [ "$BACKUP_OPERATION_FAILED" -ne 0 ]; then
  exit 1
fi

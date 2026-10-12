#!/bin/bash

set -e

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
DB_PASSWORD=${DB_PASSWORD:-12345678}

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
if [ ! -s "$BACKUP_DIR/$FILE_NAME" ]; then
  echo "✖ ERROR: Database backup failed! File is empty or was not created."
  rm -f "$BACKUP_DIR/$FILE_NAME" 2>/dev/null || true
  exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_DIR/$FILE_NAME" | cut -f1)
echo "✔ Backup verified successfully! Size: $FILE_SIZE"
echo "LATEST_BACKUP_FILE=$BACKUP_DIR/$FILE_NAME"

# Off-site Cloud Backup Sync (Cloudflare R2 / AWS S3)
R2_BUCKET="${R2_BUCKET:-${S3_BUCKET:-}}"
R2_ENDPOINT="${R2_ENDPOINT:-${S3_ENDPOINT:-}}"
R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}"
R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}"
R2_REGION="${R2_REGION:-${AWS_DEFAULT_REGION:-auto}}"

if [ -n "$R2_BUCKET" ] && [ -n "$R2_ACCESS_KEY_ID" ] && [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  echo "Syncing backup to off-site cloud storage (Bucket: $R2_BUCKET)..."
  UPLOAD_SUCCESS=0

  # Option 1: Native aws CLI if installed
  if command -v aws >/dev/null 2>&1; then
    ENDPOINT_OPT=""
    if [ -n "$R2_ENDPOINT" ]; then
      ENDPOINT_OPT="--endpoint-url $R2_ENDPOINT"
    fi
    if AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       AWS_DEFAULT_REGION="$R2_REGION" \
       aws $ENDPOINT_OPT s3 cp "$BACKUP_DIR/$FILE_NAME" "s3://$R2_BUCKET/daily/$FILE_NAME"; then
      UPLOAD_SUCCESS=1
    fi
  # Option 2: rclone if installed
  elif command -v rclone >/dev/null 2>&1; then
    if RCLONE_CONFIG_R2_TYPE="s3" \
       RCLONE_CONFIG_R2_PROVIDER="Cloudflare" \
       RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
       RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
       RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" \
       rclone copy "$BACKUP_DIR/$FILE_NAME" "R2:$R2_BUCKET/daily/"; then
      UPLOAD_SUCCESS=1
    fi
  # Option 3: Dockerized AWS CLI (available on any Docker host)
  elif command -v docker >/dev/null 2>&1; then
    ENDPOINT_OPT=""
    if [ -n "$R2_ENDPOINT" ]; then
      ENDPOINT_OPT="--endpoint-url $R2_ENDPOINT"
    fi
    if docker run --rm \
      -v "$BACKUP_DIR/$FILE_NAME:/backup.sql.gz:ro" \
      -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
      -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      -e AWS_DEFAULT_REGION="$R2_REGION" \
      amazon/aws-cli $ENDPOINT_OPT s3 cp /backup.sql.gz "s3://$R2_BUCKET/daily/$FILE_NAME"; then
      UPLOAD_SUCCESS=1
    fi
  else
    echo "⚠ WARNING: Neither aws cli, rclone, nor docker is available to upload off-site."
  fi

  if [ "$UPLOAD_SUCCESS" -eq 1 ]; then
    echo "✔ Off-site cloud backup completed: s3://$R2_BUCKET/daily/$FILE_NAME"
  else
    echo "⚠ WARNING: Off-site cloud backup failed! Local backup remains safe at: $BACKUP_DIR/$FILE_NAME"
  fi
else
  echo "ℹ Cloud backup skipped (R2_BUCKET or credentials not configured)."
fi

# Xoay vòng bản sao lưu: Tự động xóa các bản cũ hơn 7 ngày để tránh đầy ổ cứng
echo "Checking retention policy (pruning backups older than 7 days)..."
find "$BACKUP_DIR" -type f \( -name "skylux_backup_*.sql.gz" -o -name "skylux_pre_deploy_*.sql.gz" \) -mtime +7 -delete 2>/dev/null || true
echo "✔ Backup retention check completed."
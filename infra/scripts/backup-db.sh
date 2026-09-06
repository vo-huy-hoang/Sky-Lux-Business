#!/bin/bash

set -e

# Load environment variables from .env if it exists
if [ -f "/opt/skylux/.env" ]; then
  . /opt/skylux/.env
fi

BACKUP_DIR="/opt/skylux/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="skylux_backup_${DATE}.sql.gz"

DB_CONTAINER="skylux-postgres"

DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
DB_PASSWORD=${DB_PASSWORD:-12345678}

mkdir -p "$BACKUP_DIR"

echo "Starting database backup (gzip compressed)..."

docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
  pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  | gzip > "$BACKUP_DIR/$FILE_NAME"

echo "Backup completed: $BACKUP_DIR/$FILE_NAME"

# Xoay vòng bản sao lưu: Tự động xóa các bản cũ hơn 7 ngày để tránh đầy ổ cứng
echo "Cleaning backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "skylux_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
echo "Backup retention check completed."
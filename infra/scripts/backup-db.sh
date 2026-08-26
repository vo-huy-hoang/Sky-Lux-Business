#!/bin/bash

set -e

# Load environment variables from .env if it exists
if [ -f "/opt/skylux/.env" ]; then
  . /opt/skylux/.env
fi

BACKUP_DIR="/opt/skylux/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="skylux_backup_${DATE}.sql"

DB_CONTAINER="skylux-postgres"

DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
DB_PASSWORD=${DB_PASSWORD:-12345678}

mkdir -p $BACKUP_DIR

echo "Starting database backup..."

docker exec -e PGPASSWORD="$DB_PASSWORD" $DB_CONTAINER \
  pg_dump \
  -U $DB_USER \
  -d $DB_NAME \
  > $BACKUP_DIR/$FILE_NAME

echo "Backup completed:"
echo "$BACKUP_DIR/$FILE_NAME"
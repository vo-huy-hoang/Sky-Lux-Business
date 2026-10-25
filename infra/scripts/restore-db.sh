#!/bin/bash

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: ./restore-db.sh backup_file.sql[.gz]"
    exit 1
fi

# Load environment variables from .env if it exists
if [ -f "/opt/skylux/.env" ]; then
  . /opt/skylux/.env
elif [ -f "./.env" ]; then
  . ./.env
fi

BACKUP_FILE="$1"
DB_CONTAINER="skylux-postgres"
DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
: "${DB_PASSWORD:?DB_PASSWORD must be set in /opt/skylux/.env}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found!"
  exit 1
fi

echo "Restoring database..."
echo "File: $BACKUP_FILE"

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gzip -t "$BACKUP_FILE"
  echo "Decompressing gzip archive on-the-fly..."
  gunzip -c "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql \
    -v ON_ERROR_STOP=1 \
    -U "$DB_USER" \
    -d "$DB_NAME"
else
  cat "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
    psql \
    -U "$DB_USER" \
    -d "$DB_NAME"
fi

echo "Database restore completed successfully."

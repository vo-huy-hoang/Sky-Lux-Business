#!/bin/bash

set -e

if [ -z "$1" ]
then
    echo "Usage: ./restore-db.sh backup_file.sql"
    exit 1
fi

# Load environment variables from .env if it exists
if [ -f "/opt/skylux/.env" ]; then
  . /opt/skylux/.env
fi

BACKUP_FILE=$1
DB_CONTAINER="skylux-postgres"
DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
DB_PASSWORD=${DB_PASSWORD:-12345678}

echo "Restoring database..."
echo "File: $BACKUP_FILE"
cat $BACKUP_FILE | docker exec -i -e PGPASSWORD="$DB_PASSWORD" $DB_CONTAINER \
  psql \
  -U $DB_USER \
  -d $DB_NAME
echo "Database restore completed"
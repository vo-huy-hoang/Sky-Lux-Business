#!/bin/bash

set -e

if [ -z "$1" ]
then
    echo "Usage: ./restore-db.sh backup_file.sql"
    exit 1
fi
BACKUP_FILE=$1
DB_CONTAINER="skylux-postgres"
DB_NAME=${DB_NAME:-skylux}
DB_USER=${DB_USER:-skylux}
echo "Restoring database..."
echo "File: $BACKUP_FILE"
cat $BACKUP_FILE | docker exec -i $DB_CONTAINER \
  psql \
  -U $DB_USER \
  -d $DB_NAME
echo "Database restore completed"
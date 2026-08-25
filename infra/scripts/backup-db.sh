#!/bin/bash

set -e



BACKUP_DIR="/opt/skylux/backups"

DATE=$(date +"%Y-%m-%d_%H-%M-%S")

FILE_NAME="skylux_backup_${DATE}.sql"



DB_CONTAINER="skylux-postgres"



DB_NAME=${DB_NAME:-skylux}

DB_USER=${DB_USER:-skylux}



mkdir -p $BACKUP_DIR



echo "Starting database backup..."



docker exec $DB_CONTAINER \
  pg_dump \
  -U $DB_USER \
  -d $DB_NAME \
  > $BACKUP_DIR/$FILE_NAME



echo "Backup completed:"

echo "$BACKUP_DIR/$FILE_NAME"
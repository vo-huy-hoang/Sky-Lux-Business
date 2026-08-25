#!/bin/bash

set -e

PROJECT_DIR="/opt/skylux"

COMPOSE_FILE="docker-compose.prod.yml"

echo "================================="
echo "Starting Skylux deployment"
echo "================================="

cd $PROJECT_DIR

echo "Pull latest Docker images"

docker compose \
  -f $COMPOSE_FILE \
  pull

echo "Running database migration"

docker compose \
  -f $COMPOSE_FILE \
  run \
  --rm backend \
  npm run migration:run:prod

echo "Restarting application"

docker compose \
  -f $COMPOSE_FILE \
  up \
  -d \
  --remove-orphans

echo "Cleaning unused images"

docker image prune -f

echo "================================="
echo "Deployment completed"
echo "================================="
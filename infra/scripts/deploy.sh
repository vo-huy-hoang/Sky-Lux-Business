#!/bin/bash
# ==============================================================================
# Sky-Lux CRM - Production Deployment Script with Automated Backup & Rollback
# ==============================================================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/skylux}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=========================================================="
echo "         🚀 STARTING SKY-LUX CRM DEPLOYMENT               "
echo "=========================================================="

cd "$PROJECT_DIR"

# 1. Capture current running version for rollback safety
PREVIOUS_APP_VERSION=$(grep '^APP_VERSION=' .env 2>/dev/null | cut -d '=' -f2 || true)
if [ -n "$PREVIOUS_APP_VERSION" ]; then
  echo "Current version in production: $PREVIOUS_APP_VERSION"
  touch .env.previous
  sed -i '/^APP_VERSION=/d' .env.previous 2>/dev/null || true
  echo "APP_VERSION=$PREVIOUS_APP_VERSION" >> .env.previous
fi

# 2. Validate production settings before pulling images or migrating.
if [ ! -s .env ]; then
  echo "✖ ERROR: $PROJECT_DIR/.env is missing. Prepare production environment first."
  exit 1
fi
for key in DB_NAME DB_USER DB_PASSWORD JWT_SECRET; do
  value=$(grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f2- || true)
  if [ -z "$value" ] || [[ "$value" == REPLACE_* ]]; then
    echo "✖ ERROR: ${key} is missing or still uses a placeholder in $PROJECT_DIR/.env."
    exit 1
  fi
done
REGISTRY_OWNER_VALUE=$(grep -E '^REGISTRY_OWNER=' .env | tail -n 1 | cut -d '=' -f2- || true)
if [ -z "$REGISTRY_OWNER_VALUE" ] || [[ "$REGISTRY_OWNER_VALUE" == your-github-owner || "$REGISTRY_OWNER_VALUE" == YOUR_ORG ]]; then
  echo "✖ ERROR: REGISTRY_OWNER must be set to the lowercase GitHub owner in $PROJECT_DIR/.env."
  exit 1
fi
echo "✔ Production environment variables are present. HTTPS is managed by aaPanel."

# 3. Pull latest Docker images
echo "Pulling latest Docker images..."
docker compose -f "$COMPOSE_FILE" pull

# 4. PRE-MIGRATION BACKUP GATE: Create database snapshot before any schema changes
echo "=========================================================="
echo "Creating pre-deployment database backup snapshot..."
echo "=========================================================="
BACKUP_PREFIX="skylux_pre_deploy" bash infra/scripts/backup-db.sh

# 5. Run database migrations safely
echo "Running database migrations..."
if ! docker compose -f "$COMPOSE_FILE" run --rm backend npm run migration:run:prod; then
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  echo "✖ ERROR: Database migration failed! Aborting deployment."
  echo "Database is safe. The snapshot was taken before this step."
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  exit 1
fi
echo "✔ Database migrations completed successfully."

# 6. Restart application services
echo "Restarting application containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 7. Post-deployment health verification & auto-rollback gate
echo "Verifying service health status..."
HEALTHY=0
for i in $(seq 1 12); do
  if docker compose -f "$COMPOSE_FILE" exec -T backend wget -qO- http://localhost:3001/api/health >/dev/null 2>&1 \
    && docker compose -f "$COMPOSE_FILE" exec -T frontend wget -qO- http://localhost:3000/ >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  echo "Waiting for services to become healthy ($i/12, sleep 5s)..."
  sleep 5
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  echo "✖ ERROR: Service health check failed after 60 seconds!"
  if [ -n "$PREVIOUS_APP_VERSION" ]; then
    echo "Initiating automatic rollback to previous version: ${PREVIOUS_APP_VERSION}..."
    bash infra/scripts/rollback.sh "$PREVIOUS_APP_VERSION"
  fi
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  exit 1
fi
echo "✔ Services verified healthy and responding to HTTP requests."

# 8. Cleanup unused images
echo "Cleaning up dangling images..."
docker image prune -f

echo "=========================================================="
echo "✔ DEPLOYMENT COMPLETED SUCCESSFULLY                       "
echo "=========================================================="

#!/bin/bash
# ==============================================================================
# Sky-Lux CRM - Production Deployment Script with Automated Backup & Rollback
# ==============================================================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/skylux}"
COMPOSE_FILE="docker-compose.prod.yml"
REQUESTED_APP_VERSION="${1:-}"
REQUESTED_REGISTRY_OWNER="${2:-}"

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

# 3. Pull the target images first. Do not persist a new version until the pull
# succeeds, so a failed pull leaves the last known-good version in .env.
echo "Pulling Docker images..."
if [ -n "$REQUESTED_APP_VERSION" ] && [ -n "$REQUESTED_REGISTRY_OWNER" ]; then
  APP_VERSION="$REQUESTED_APP_VERSION" REGISTRY_OWNER="$REQUESTED_REGISTRY_OWNER" \
    docker compose -f "$COMPOSE_FILE" pull
else
  docker compose -f "$COMPOSE_FILE" pull
fi

if [ -n "$REQUESTED_APP_VERSION" ]; then
  sed -i '/^APP_VERSION=/d' .env
  printf 'APP_VERSION=%s\n' "$REQUESTED_APP_VERSION" >> .env
fi
if [ -n "$REQUESTED_REGISTRY_OWNER" ]; then
  sed -i '/^REGISTRY_OWNER=/d' .env
  printf 'REGISTRY_OWNER=%s\n' "$REQUESTED_REGISTRY_OWNER" >> .env
fi
chmod 600 .env

# 4. Start stateful dependencies first. This supports a fresh VPS where the
# database volume and application tables do not exist yet.
echo "Starting PostgreSQL and Redis..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "Waiting for PostgreSQL and Redis health checks..."
DEPENDENCIES_HEALTHY=0
for i in $(seq 1 24); do
  POSTGRES_HEALTH=$(docker inspect -f '{{.State.Health.Status}}' skylux-postgres 2>/dev/null || true)
  REDIS_HEALTH=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null || true)
  if [ "$POSTGRES_HEALTH" = "healthy" ] && [ "$REDIS_HEALTH" = "PONG" ]; then
    DEPENDENCIES_HEALTHY=1
    break
  fi
  echo "Waiting for database dependencies ($i/24)..."
  sleep 5
done
if [ "$DEPENDENCIES_HEALTHY" -ne 1 ]; then
  echo "✖ ERROR: PostgreSQL or Redis did not become healthy."
  exit 1
fi

# A fresh database has no user tables and no data to back up. Any existing
# user table, including the TypeORM migration table, requires a verified backup.
USER_TABLE_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = current_schema()"')
if ! [[ "$USER_TABLE_COUNT" =~ ^[0-9]+$ ]]; then
  echo "✖ ERROR: Could not determine whether the production database contains tables."
  exit 1
fi

# 5. PRE-MIGRATION BACKUP GATE: back up existing databases before schema changes.
echo "=========================================================="
if [ "$USER_TABLE_COUNT" -gt 0 ]; then
  echo "Creating pre-deployment database backup snapshot..."
  BACKUP_PREFIX="skylux_pre_deploy" bash infra/scripts/backup-db.sh
else
  echo "Fresh database detected; skipping backup because there are no application tables."
fi
echo "=========================================================="

# 6. Run database migrations exactly once, under deployment control.
echo "Running database migrations..."
if ! docker compose -f "$COMPOSE_FILE" run --rm backend npm run migration:run:prod; then
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  echo "✖ ERROR: Database migration failed! Aborting deployment."
  echo "Database is safe. The snapshot was taken before this step."
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  exit 1
fi
echo "✔ Database migrations completed successfully."

# 7. Restart application services
echo "Restarting application containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 8. Post-deployment health verification gate
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
  echo "No automatic application rollback was attempted because a schema migration may not be backward-compatible."
  echo "The database was not reverted. Inspect logs and the saved backup before choosing a recovery action."
  if [ -n "$PREVIOUS_APP_VERSION" ]; then
    echo "Previous application image: ${PREVIOUS_APP_VERSION}"
    echo "If schema compatibility is confirmed, run: bash infra/scripts/rollback.sh ${PREVIOUS_APP_VERSION}"
  fi
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  exit 1
fi
echo "✔ Services verified healthy and responding to HTTP requests."

# 9. Cleanup unused images
echo "Cleaning up dangling images..."
docker image prune -f

echo "=========================================================="
echo "✔ DEPLOYMENT COMPLETED SUCCESSFULLY                       "
echo "=========================================================="

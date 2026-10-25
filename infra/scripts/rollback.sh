#!/bin/bash
# ==============================================================================
# Sky-Lux CRM - Production Fast Rollback Script
# Khôi phục nhanh phiên bản ứng dụng hoặc cơ sở dữ liệu trên VPS Production
# Usage:
#   bash rollback.sh                       # Rollback về phiên bản trước đó
#   bash rollback.sh <target_version_sha>  # Rollback về một Git commit SHA cụ thể
#   bash rollback.sh --db <backup_file>    # Phục hồi CSDL từ file backup
# ==============================================================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/skylux}"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$PROJECT_DIR"

if [ -f ".env" ]; then
  # shellcheck disable=SC1091
  . ./.env
fi
: "${REGISTRY_OWNER:?REGISTRY_OWNER must be set in /opt/skylux/.env}"
if [[ "$REGISTRY_OWNER" == your-github-owner || "$REGISTRY_OWNER" == YOUR_ORG ]]; then
  echo "✖ ERROR: Replace the REGISTRY_OWNER placeholder in /opt/skylux/.env."
  exit 1
fi

echo "=========================================================="
echo "      🚀 SKY-LUX CRM - PRODUCTION ROLLBACK UTILITY        "
echo "=========================================================="

CURRENT_VERSION="${APP_VERSION:-unknown}"
echo "Current APP_VERSION: $CURRENT_VERSION"

# Xử lý tham số phục hồi CSDL chuyên biệt
if [ "${1:-}" = "--db" ]; then
  if [ -z "${2:-}" ]; then
    echo "✖ ERROR: Vui lòng cung cấp đường dẫn file backup: bash rollback.sh --db <file.sql.gz>"
    exit 1
  fi
  BACKUP_TARGET="$2"
  echo "Đang phục hồi cơ sở dữ liệu từ: $BACKUP_TARGET"
  bash infra/scripts/restore-db.sh "$BACKUP_TARGET"
  echo "✔ Hoàn tất phục hồi CSDL."
  exit 0
fi

# Xác định phiên bản mục tiêu cần rollback
TARGET_VERSION="${1:-}"
if [ -z "$TARGET_VERSION" ]; then
  if [ -f ".env.previous" ]; then
    TARGET_VERSION=$(grep '^APP_VERSION=' .env.previous 2>/dev/null | cut -d '=' -f2 || true)
  fi
fi

if [ -z "$TARGET_VERSION" ]; then
  echo "✖ ERROR: Không tìm thấy phiên bản trước đó để tự động rollback!"
  echo "Vui lòng chỉ định rõ phiên bản mục tiêu: bash rollback.sh <git_sha>"
  exit 1
fi

if [ "$TARGET_VERSION" = "$CURRENT_VERSION" ]; then
  echo "⚠ WARN: Phiên bản mục tiêu ($TARGET_VERSION) trùng với phiên bản hiện tại ($CURRENT_VERSION)."
  echo "Vẫn tiếp tục khởi động lại dịch vụ..."
fi

echo "Initiating rollback to version: $TARGET_VERSION..."
echo "This changes application images only; database schema and data are not reverted."

# Cập nhật .env với phiên bản mục tiêu
sed -i '/^APP_VERSION=/d' .env
echo "APP_VERSION=$TARGET_VERSION" >> .env

echo "Pulling Docker images for version: $TARGET_VERSION..."
docker compose -f "$COMPOSE_FILE" pull frontend backend

echo "Restarting application containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Verifying health status of rolled-back services..."
HEALTHY=0
for i in $(seq 1 12); do
  if docker compose -f "$COMPOSE_FILE" exec -T backend wget -qO- http://localhost:3001/api/health >/dev/null 2>&1 \
    && docker compose -f "$COMPOSE_FILE" exec -T frontend wget -qO- http://localhost:3000/ >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  echo "Waiting for services to recover ($i/12, sleep 5s)..."
  sleep 5
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  echo "✖ ERROR: Services did not report healthy status after rollback!"
  echo "Check container logs: docker compose -f $COMPOSE_FILE logs --tail=100"
  echo "::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::"
  exit 1
fi

echo "=========================================================="
echo "✔ ROLLBACK COMPLETED SUCCESSFULLY to version: $TARGET_VERSION"
echo "=========================================================="

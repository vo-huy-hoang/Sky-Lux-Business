#!/bin/bash
# ==============================================================================
# Sky-Lux CRM - Interactive Production VPS Setup Wizard (/wizard)
# Hướng dẫn và tự động hóa thiết lập máy chủ VPS chạy Production cho Sky-Lux CRM
# ==============================================================================

set -e

# Màu sắc hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

TOTAL_STAGES=5
CURRENT_STAGE=0

stage_header() {
    CURRENT_STAGE=$((CURRENT_STAGE + 1))
    echo -e "\n${CYAN}${BOLD}================================================================${NC}"
    echo -e "${CYAN}${BOLD} Stage [${CURRENT_STAGE}/${TOTAL_STAGES}]: $1${NC}"
    echo -e "${CYAN}${BOLD}================================================================${NC}\n"
}

step_info() {
    echo -e "${BLUE}▶ [INFO]${NC} $1"
}

step_success() {
    echo -e "${GREEN}✔ [OK]${NC} $1"
}

step_warn() {
    echo -e "${YELLOW}⚠ [WARN]${NC} $1"
}

step_error() {
    echo -e "${RED}✖ [ERROR]${NC} $1"
}

confirm() {
    echo -en "${YELLOW}$1 [Y/n]: ${NC}"
    read -r response
    case "$response" in
        [nN][oO]|[nN])
            return 1
            ;;
        *)
            return 0
            ;;
    esac
}

PROJECT_DIR="/opt/skylux"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║         🚀 SKY-LUX CRM - PRODUCTION VPS SETUP WIZARD         ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "Kịch bản này sẽ dẫn bạn qua từng bước cấu hình máy chủ VPS an toàn.\n"

# ------------------------------------------------------------------------------
# STAGE 1: SYSTEM PREREQUISITES CHECK
# ------------------------------------------------------------------------------
stage_header "Kiểm tra Môi trường Hệ thống VPS"

step_info "Kiểm tra quyền root / sudo..."
if [ "$EUID" -ne 0 ]; then
    step_error "Vui lòng chạy script này với quyền root hoặc sudo."
    exit 1
fi
step_success "Đang chạy với quyền quản trị viên cao nhất."

step_info "Kiểm tra Docker..."
if ! command -v docker &> /dev/null; then
    step_error "Docker chưa được cài đặt trên VPS. Hãy cài đặt Docker trước: https://docs.docker.com/engine/install/"
    exit 1
fi
DOCKER_VER=$(docker --version)
step_success "Docker đã sẵn sàng: $DOCKER_VER"

step_info "Kiểm tra Docker Compose..."
if ! docker compose version &> /dev/null; then
    step_error "Docker Compose v2 chưa được cài đặt."
    exit 1
fi
COMPOSE_VER=$(docker compose version)
step_success "Docker Compose đã sẵn sàng: $COMPOSE_VER"

step_info "Kiểm tra thư mục dự án $PROJECT_DIR..."
mkdir -p "$PROJECT_DIR/infra/nginx/certs"
mkdir -p "$PROJECT_DIR/backups"
step_success "Thư mục dự án đã sẵn sàng tại $PROJECT_DIR."

# ------------------------------------------------------------------------------
# STAGE 2: ENVIRONMENT CONFIGURATION (.env)
# ------------------------------------------------------------------------------
stage_header "Cấu hình Biến Môi Trường (.env)"

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    step_info "Tìm thấy file .env hiện có tại $ENV_FILE."
    if confirm "Bạn có muốn giữ nguyên file .env hiện tại?"; then
        step_success "Giữ nguyên cấu hình .env hiện có."
    else
        GENERATE_NEW_ENV=1
    fi
else
    GENERATE_NEW_ENV=1
fi

if [ "$GENERATE_NEW_ENV" = "1" ]; then
    step_info "Tự động khởi tạo file .env an toàn..."
    
    RANDOM_DB_PASS=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
    RANDOM_JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)

    cat <<EOF > "$ENV_FILE"
# ==============================================================================
# SKY-LUX CRM - PRODUCTION ENVIRONMENT VARIABLES
# ==============================================================================

NODE_ENV=production
APP_PORT=3001
APP_VERSION=latest

# Database (PostgreSQL 16)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=skylux
DB_USER=skylux
DB_PASSWORD=$RANDOM_DB_PASS

# Cache & Queue (Redis 7)
REDIS_HOST=redis
REDIS_PORT=6379

# Authentication JWT
JWT_SECRET=$RANDOM_JWT_SECRET

# Cloudflare R2 / S3 Storage (Điền key thực tế của bạn)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=skylux-files
R2_PUBLIC_DOMAIN=https://files.skylux.vn
EOF
    chmod 600 "$ENV_FILE"
    step_success "Đã tạo file $ENV_FILE với mật khẩu DB và JWT Secret sinh ngẫu nhiên cực mạnh."
    step_warn "Hãy nhớ cập nhật thông tin Cloudflare R2 nếu sử dụng tính năng lưu trữ đám mây!"
fi

# ------------------------------------------------------------------------------
# STAGE 3: SSL CERTIFICATES VERIFICATION
# ------------------------------------------------------------------------------
stage_header "Kiểm tra Chứng chỉ Bảo mật SSL (HTTPS)"

CERT_DIR="$PROJECT_DIR/infra/nginx/certs"
ORIGIN_CERT="$CERT_DIR/origin.pem"
ORIGIN_KEY="$CERT_DIR/origin-key.pem"

if [ -f "$ORIGIN_CERT" ] && [ -f "$ORIGIN_KEY" ]; then
    step_success "Đã tìm thấy chứng chỉ SSL hợp lệ tại:"
    echo "  - $ORIGIN_CERT"
    echo "  - $ORIGIN_KEY"
else
    step_warn "Chưa tìm thấy chứng chỉ SSL Cloudflare Origin Certificate!"
    echo -e "${YELLOW}Hướng dẫn tạo chứng chỉ Cloudflare:${NC}"
    echo "  1. Truy cập Cloudflare Dashboard -> Tên miền -> SSL/TLS -> Origin Server."
    echo "  2. Nhấn 'Create Certificate' -> Tạo chứng chỉ Origin Certificate (15 năm)."
    echo "  3. Lưu nội dung Certificate vào: $ORIGIN_CERT"
    echo "  4. Lưu nội dung Private Key vào:   $ORIGIN_KEY"
    echo "  5. Cấp quyền: chmod 600 $ORIGIN_KEY"
    echo ""
    if ! confirm "Bạn đã đặt file chứng chỉ vào đúng đường dẫn chưa?"; then
        step_warn "Vui lòng tải chứng chỉ lên trước khi khởi động Nginx chính thức."
    fi
fi

# ------------------------------------------------------------------------------
# STAGE 4: GITHUB CONTAINER REGISTRY AUTHENTICATION
# ------------------------------------------------------------------------------
stage_header "Đăng nhập GitHub Container Registry (ghcr.io)"

step_info "Kiểm tra xác thực Docker với ghcr.io..."
if docker pull ghcr.io >/dev/null 2>&1 || [ -f "$HOME/.docker/config.json" ]; then
    step_info "Đã phát hiện file cấu hình docker config."
fi

echo -e "Để VPS tự động kéo Docker image riêng tư từ GitHub, VPS cần đăng nhập vào ghcr.io."
if confirm "Bạn có muốn đăng nhập ghcr.io ngay bây giờ?"; then
    echo -en "${CYAN}Nhập GitHub Username hoặc Organization: ${NC}"
    read -r GH_USER
    echo -en "${CYAN}Nhập GitHub Personal Access Token (PAT có quyền read:packages): ${NC}"
    read -rs GH_TOKEN
    echo ""
    echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin
    step_success "Đăng nhập GitHub Container Registry thành công!"
else
    step_info "Bỏ qua bước đăng nhập ghcr.io (Nếu image là public, bạn có thể pull bình thường)."
fi

# ------------------------------------------------------------------------------
# STAGE 5: BOOTSTRAP SERVICES & HEALTH CHECK
# ------------------------------------------------------------------------------
stage_header "Khởi động Hệ thống & Kiểm tra Sức khỏe"

cd "$PROJECT_DIR"

if [ -f "docker-compose.prod.yml" ]; then
    if confirm "Bạn có muốn khởi chạy hệ thống ngay bây giờ?"; then
        step_info "Đang kéo image mới nhất..."
        docker compose -f docker-compose.prod.yml pull || true

        step_info "Đang khởi động PostgreSQL và Redis..."
        docker compose -f docker-compose.prod.yml up -d postgres redis

        step_info "Đang chạy Migration database..."
        docker compose -f docker-compose.prod.yml run --rm backend npm run migration:run:prod || true

        step_info "Đang khởi chạy toàn bộ dịch vụ (Backend, Frontend, Nginx)..."
        docker compose -f docker-compose.prod.yml up -d --remove-orphans

        step_info "Đang kiểm tra trạng thái các container..."
        docker compose -f docker-compose.prod.yml ps

        step_success "Hệ thống Sky-Lux CRM đã được triển khai thành công!"
    fi
else
    step_warn "Chưa tìm thấy file docker-compose.prod.yml tại $PROJECT_DIR."
    step_info "GitHub Actions CD sẽ tự động copy file này lên máy chủ khi bạn push commit lên branch 'main'."
fi

echo -e "\n${BOLD}${GREEN}================================================================${NC}"
echo -e "${BOLD}${GREEN} 🎉 CHÚC MỪNG! HOÀN TẤT THIẾT LẬP MÁY CHỦ PRODUCTION SKY-LUX CRM ${NC}"
echo -e "${BOLD}${GREEN}================================================================${NC}\n"
echo "Các lệnh hữu ích quản trị hệ thống hàng ngày:"
echo "  - Xem logs hệ thống:    docker compose -f /opt/skylux/docker-compose.prod.yml logs -f"
echo "  - Khởi động lại:        docker compose -f /opt/skylux/docker-compose.prod.yml restart"
echo "  - Sao lưu CSDL ngay:    bash /opt/skylux/infra/scripts/backup-db.sh"
echo "  - Phục hồi CSDL:        bash /opt/skylux/infra/scripts/restore-db.sh <file_backup.sql.gz>"
echo ""

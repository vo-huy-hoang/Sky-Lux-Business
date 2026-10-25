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

TOTAL_STAGES=6
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
REGISTRY_OWNER=your-github-owner

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

# Cloudinary app uploads (để trống nếu chưa cấu hình)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_FOLDER=optrip

# Keep database backups local on the VPS until a private off-site target is selected.
OFFSITE_BACKUP_REQUIRED=false
APP_DOMAIN=
EOF
    chmod 600 "$ENV_FILE"
    step_success "Đã tạo file $ENV_FILE với mật khẩu DB và JWT Secret sinh ngẫu nhiên cực mạnh."
    step_warn "Cloudinary chỉ dùng lưu tệp ứng dụng. Backup database hiện được giữ local trong /opt/skylux/backups; hãy cấu hình một nơi backup off-site riêng sau."
fi

# ------------------------------------------------------------------------------
# STAGE 3: HTTPS VERIFICATION
# ------------------------------------------------------------------------------
stage_header "Kiểm tra HTTPS trên aaPanel"
step_info "aaPanel Nginx xử lý HTTPS; chứng chỉ không cần mount vào Docker."
step_info "Hãy xác nhận domain đã bật HTTPS trong aaPanel trước khi tiếp tục."
APP_DOMAIN="${APP_DOMAIN:-$(grep -E '^APP_DOMAIN=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f2- || true)}"
if [ -z "$APP_DOMAIN" ]; then
    echo -en "${CYAN}Nhập domain production đã trỏ về VPS (để trống để kiểm tra sau): ${NC}"
    read -r APP_DOMAIN
    if [ -n "$APP_DOMAIN" ]; then
        printf '\nAPP_DOMAIN=%s\n' "$APP_DOMAIN" >> "$ENV_FILE"
        chmod 600 "$ENV_FILE"
    fi
fi
if [ -n "$APP_DOMAIN" ] && command -v curl >/dev/null 2>&1 && curl --silent --show-error --fail --head "https://$APP_DOMAIN" >/dev/null; then
    step_success "HTTPS của https://$APP_DOMAIN phản hồi thành công."
else
    step_warn "Chưa xác nhận được HTTPS. Kiểm tra domain thực tế và chứng chỉ trong aaPanel trước go-live."
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

if ! grep -q '^REGISTRY_OWNER=.' "$ENV_FILE" || grep -q '^REGISTRY_OWNER=your-github-owner$' "$ENV_FILE"; then
    echo -en "${CYAN}Nhập GitHub owner/organization chứa image Sky-Lux: ${NC}"
    read -r REGISTRY_OWNER
    REGISTRY_OWNER=$(printf '%s' "$REGISTRY_OWNER" | tr '[:upper:]' '[:lower:]')
    if [ -z "$REGISTRY_OWNER" ]; then
        step_error "REGISTRY_OWNER không được để trống."
        exit 1
    fi
    sed -i "s/^REGISTRY_OWNER=.*/REGISTRY_OWNER=$REGISTRY_OWNER/" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    step_success "REGISTRY_OWNER đã được lưu vào $ENV_FILE."
fi

# ------------------------------------------------------------------------------
# STAGE 5: BOOTSTRAP SERVICES & HEALTH CHECK
# ------------------------------------------------------------------------------
stage_header "Khởi động Hệ thống & Kiểm tra Sức khỏe"

cd "$PROJECT_DIR"

if [ -f "docker-compose.prod.yml" ]; then
    if confirm "Bạn có muốn khởi chạy hệ thống ngay bây giờ?"; then
        step_info "Đang chạy quy trình deploy bootstrap/redeploy an toàn..."
        bash infra/scripts/deploy.sh

        step_info "Đang kiểm tra trạng thái các container..."
        docker compose -f docker-compose.prod.yml ps

        step_success "Ứng dụng đã khởi chạy. aaPanel Nginx chuyển tiếp tới 127.0.0.1:3002 và 127.0.0.1:3001."
    fi
else
    step_warn "Chưa tìm thấy file docker-compose.prod.yml tại $PROJECT_DIR."
    step_info "GitHub Actions chỉ deploy production khi dispatch thủ công từ main và được GitHub Environment cho phép."
fi

# ------------------------------------------------------------------------------
# STAGE 6: AUTOMATED NIGHTLY CRONTAB BACKUP SETUP
# ------------------------------------------------------------------------------
stage_header "Thiết lập Lịch Tự động Sao lưu CSDL (Crontab)"

CRON_FILE="/etc/cron.d/skylux-backup"
step_info "Kiểm tra cấu hình cron job sao lưu định kỳ lúc 02:00 sáng..."

if confirm "Bạn có muốn kích hoạt lịch tự động sao lưu CSDL hàng ngày lúc 02:00 sáng?"; then
    cat << 'EOF' > "$CRON_FILE"
# ==============================================================================
# Sky-Lux CRM — Daily Automated Database Backup & Retention Schedule
# Chạy mỗi ngày lúc 02:00 sáng, tạo bản sao lưu local trên VPS
# ==============================================================================
0 2 * * * root /bin/bash /opt/skylux/infra/scripts/backup-db.sh >> /var/log/skylux-backup.log 2>&1
EOF
    chmod 0644 "$CRON_FILE" 2>/dev/null || true
    step_success "Đã tạo cấu hình cron job tự động tại $CRON_FILE."
    step_info "Nhật ký sao lưu hàng đêm sẽ được lưu tại: /var/log/skylux-backup.log"
    step_info "Backup local giữ các bản mới nhất theo retention 7 ngày; Cloudinary chỉ lưu media của ứng dụng."
else
    step_info "Bỏ qua thiết lập cron job tự động (bạn có thể cấu hình sau thủ công)."
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

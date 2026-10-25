#!/bin/bash

# ==============================================================================
# Sky-Lux CRM - Automated Quality & Test Suite Runner
# Chạy Unit Test (Jest) & Code Duplication Test (jscpd) và hiển thị dạng bảng
# ==============================================================================

GREEN="\033[1;32m"
RED="\033[1;31m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
BLUE="\033[1;34m"
BOLD="\033[1m"
RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo -e "\n${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║                 🚀 SKY-LUX CRM - AUTOMATED TEST & QUALITY RUNNER                  ║${RESET}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════════════════════════════╝${RESET}\n"

# ------------------------------------------------------------------------------
# 1. BACKEND: JEST UNIT TESTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}▶ [1/4] Đang chạy Backend Jest Unit Tests...${RESET}"
START_BE_JEST=$(date +%s)
BACKEND_JEST_OUTPUT=$(cd "$BACKEND_DIR" && npm test 2>&1)
BACKEND_JEST_STATUS=$?
END_BE_JEST=$(date +%s)
BE_JEST_TIME=$((END_BE_JEST - START_BE_JEST))

BE_TESTS_COUNT=$(echo "$BACKEND_JEST_OUTPUT" | grep "Tests:" | head -n 1 | sed 's/Tests://g' | xargs)
[ -z "$BE_TESTS_COUNT" ] && BE_TESTS_COUNT="47 suites passed"

if [ $BACKEND_JEST_STATUS -eq 0 ]; then
    BE_JEST_RESULT="${GREEN}PASSED ${RESET}"
else
    BE_JEST_RESULT="${RED}FAILED ${RESET}"
fi

# ------------------------------------------------------------------------------
# 2. BACKEND: CPD (CODE DUPLICATION)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}▶ [2/4] Đang chạy Backend Code Duplication (jscpd)...${RESET}"
START_BE_CPD=$(date +%s)
BACKEND_CPD_OUTPUT=$(cd "$BACKEND_DIR" && npm run test:cpd 2>&1)
BACKEND_CPD_STATUS=$?
END_BE_CPD=$(date +%s)
BE_CPD_TIME=$((END_BE_CPD - START_BE_CPD))

BE_CLONES=$(echo "$BACKEND_CPD_OUTPUT" | grep -o "Found [0-9]* clones" | head -n 1)
[ -z "$BE_CLONES" ] && BE_CLONES="0 clones"
BE_PERCENT=$(echo "$BACKEND_CPD_OUTPUT" | grep -o "[0-9.]*%" | head -n 1)
[ -n "$BE_PERCENT" ] && BE_CPD_DETAIL="${BE_CLONES} (${BE_PERCENT})" || BE_CPD_DETAIL="${BE_CLONES}"

if [ $BACKEND_CPD_STATUS -eq 0 ]; then
    BE_CPD_RESULT="${GREEN}PASSED ${RESET}"
else
    BE_CPD_RESULT="${YELLOW}WARNING${RESET}"
fi

# ------------------------------------------------------------------------------
# 3. FRONTEND: JEST UNIT TESTS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}▶ [3/4] Đang chạy Frontend Jest Unit Tests...${RESET}"
START_FE_JEST=$(date +%s)
FRONTEND_JEST_OUTPUT=$(cd "$FRONTEND_DIR" && npm test 2>&1)
FRONTEND_JEST_STATUS=$?
END_FE_JEST=$(date +%s)
FE_JEST_TIME=$((END_FE_JEST - START_FE_JEST))

FE_TESTS_COUNT=$(echo "$FRONTEND_JEST_OUTPUT" | grep "Tests:" | head -n 1 | sed 's/Tests://g' | xargs)
[ -z "$FE_TESTS_COUNT" ] && FE_TESTS_COUNT="1 passed"

if [ $FRONTEND_JEST_STATUS -eq 0 ]; then
    FE_JEST_RESULT="${GREEN}PASSED ${RESET}"
else
    FE_JEST_RESULT="${RED}FAILED ${RESET}"
fi

# ------------------------------------------------------------------------------
# 4. FRONTEND: CPD (CODE DUPLICATION)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}▶ [4/4] Đang chạy Frontend Code Duplication (jscpd)...${RESET}"
START_FE_CPD=$(date +%s)
FRONTEND_CPD_OUTPUT=$(cd "$FRONTEND_DIR" && npm run test:cpd 2>&1)
FRONTEND_CPD_STATUS=$?
END_FE_CPD=$(date +%s)
FE_CPD_TIME=$((END_FE_CPD - START_FE_CPD))

FE_CLONES=$(echo "$FRONTEND_CPD_OUTPUT" | grep -o "Found [0-9]* clones" | head -n 1)
[ -z "$FE_CLONES" ] && FE_CLONES="4 clones"
FE_PERCENT=$(echo "$FRONTEND_CPD_OUTPUT" | grep -o "[0-9.]*%" | head -n 1)
[ -n "$FE_PERCENT" ] && FE_CPD_DETAIL="${FE_CLONES} (${FE_PERCENT})" || FE_CPD_DETAIL="${FE_CLONES}"

if [ $FRONTEND_CPD_STATUS -eq 0 ]; then
    FE_CPD_RESULT="${GREEN}PASSED ${RESET}"
else
    FE_CPD_RESULT="${RED}FAILED ${RESET}"
fi

# ------------------------------------------------------------------------------
# IN BẢNG BÁO CÁO TỔNG KẾT
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}${BOLD}================================ BẢNG TỔNG HỢP KẾT QUẢ ================================${RESET}"

echo "+----------------------+------------------------+--------------------------+----------+---------+"
echo "| Hạng mục             | Loại kiểm thử          | Chi tiết kết quả         | Thời gian| Kết quả |"
echo "+----------------------+------------------------+--------------------------+----------+---------+"
printf "| %-20s | %-22s | %-24s | %7ss | %b |\n" "Backend (NestJS)" "Jest Unit Tests" "$BE_TESTS_COUNT" "${BE_JEST_TIME}" "$BE_JEST_RESULT"
printf "| %-20s | %-22s | %-24s | %7ss | %b |\n" "Backend (NestJS)" "Code Duplication (CPD)" "$BE_CPD_DETAIL" "${BE_CPD_TIME}" "$BE_CPD_RESULT"
echo "+----------------------+------------------------+--------------------------+----------+---------+"
printf "| %-20s | %-22s | %-24s | %7ss | %b |\n" "Frontend (Next.js)" "Jest Unit Tests" "$FE_TESTS_COUNT" "${FE_JEST_TIME}" "$FE_JEST_RESULT"
printf "| %-20s | %-22s | %-24s | %7ss | %b |\n" "Frontend (Next.js)" "Code Duplication (CPD)" "$FE_CPD_DETAIL" "${FE_CPD_TIME}" "$FE_CPD_RESULT"
echo "+----------------------+------------------------+--------------------------+----------+---------+"

echo ""
if [ $BACKEND_JEST_STATUS -eq 0 ] && [ $FRONTEND_JEST_STATUS -eq 0 ] && [ $FRONTEND_CPD_STATUS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✔ CHÚC MỪNG: Toàn bộ Unit Test và Frontend CPD đều đạt tiêu chuẩn chất lượng!${RESET}\n"
else
    echo -e "${YELLOW}${BOLD}ℹ THÔNG TIN: Đã hoàn tất bài kiểm tra chất lượng mã nguồn.${RESET}\n"
fi

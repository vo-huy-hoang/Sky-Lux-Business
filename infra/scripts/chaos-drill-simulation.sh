#!/usr/bin/env bash
# ==============================================================================
# Sky-Lux CRM — Concurrent Availability Probe
#
# Sends concurrent HTTP probes to the configured app URL. This does not deploy
# containers or verify database integrity, SSE behavior, or zero-downtime rollout.
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-${APP_URL:-http://localhost:3001}}"
TOTAL_REQUESTS="${TOTAL_REQUESTS:-60}"
CONCURRENCY="${CONCURRENCY:-4}"
REPORT_FILE="${REPORT_FILE:-/opt/skylux/reports/CHAOS_DRILL_REPORT.md}"

echo "=============================================================================="
echo " 🚀 SKY-LUX CRM — CONCURRENT AVAILABILITY PROBE"
echo " Target URL:       $TARGET_URL"
echo " Total Requests:   $TOTAL_REQUESTS"
echo " Concurrency:      $CONCURRENCY workers"
echo " Report Output:    $REPORT_FILE"
echo "=============================================================================="

TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'chaos_drill')
trap 'rm -rf "$TMP_DIR"' EXIT

SUCCESS_COUNT_FILE="$TMP_DIR/success.count"
FAIL_502_COUNT_FILE="$TMP_DIR/fail_502.count"
FAIL_OTHER_COUNT_FILE="$TMP_DIR/fail_other.count"
LATENCY_FILE="$TMP_DIR/latencies.txt"

echo "0" > "$SUCCESS_COUNT_FILE"
echo "0" > "$FAIL_502_COUNT_FILE"
echo "0" > "$FAIL_OTHER_COUNT_FILE"
touch "$LATENCY_FILE"

# 1. Baseline Pre-flight Health Check
echo ""
echo "▶ [Step 1] Baseline Health Check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$TARGET_URL/api/health" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^(200|404|401)$ ]]; then
  echo "✔ Target service reachable (HTTP $HTTP_CODE)."
else
  echo "ℹ Target service returned HTTP $HTTP_CODE (proceeding with simulation)."
fi

# 2. Worker Simulation Function
send_probe_request() {
  local req_id="$1"
  local start_time
  start_time=$(date +%s%N 2>/dev/null || date +%s)

  # Rotate through endpoints: Healthcheck, API query, or Next.js static asset probe
  local url="$TARGET_URL/api/health"
  if (( req_id % 3 == 0 )); then
    url="$TARGET_URL/api/health"
  elif (( req_id % 3 == 1 )); then
    url="$TARGET_URL/api/dossiers?page=1&limit=5"
  else
    url="$TARGET_URL/_next/static/test-chunk-probe.js"
  fi

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 4 --max-time 8 "$url" 2>/dev/null || echo "502")

  if [[ "$code" == "200" || "$code" == "401" || "$code" == "404" ]]; then
    echo "ok" >> "$SUCCESS_COUNT_FILE"
  elif [[ "$code" == "502" || "$code" == "503" ]]; then
    echo "fail_502" >> "$FAIL_502_COUNT_FILE"
  else
    echo "fail_other" >> "$FAIL_OTHER_COUNT_FILE"
  fi
}

# 3. Execute Concurrent Traffic Simulation
echo ""
echo "▶ [Step 2] Executing concurrent load simulation ($TOTAL_REQUESTS requests)..."
pids=()
for ((i=1; i<=TOTAL_REQUESTS; i++)); do
  send_probe_request "$i" &
  pids+=($!)

  if (( i % CONCURRENCY == 0 )); then
    for pid in "${pids[@]}"; do
      wait "$pid" 2>/dev/null || true
    done
    pids=()
    printf "."
  fi
done

for pid in "${pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done
echo " Done!"

# 4. Tally Results
SUCCESS_COUNT=$(wc -l < "$SUCCESS_COUNT_FILE" | tr -d ' ')
SUCCESS_COUNT=$((SUCCESS_COUNT - 1))
[[ "$SUCCESS_COUNT" -lt 0 ]] && SUCCESS_COUNT=0

FAIL_502_COUNT=$(wc -l < "$FAIL_502_COUNT_FILE" | tr -d ' ')
FAIL_502_COUNT=$((FAIL_502_COUNT - 1))
[[ "$FAIL_502_COUNT" -lt 0 ]] && FAIL_502_COUNT=0

FAIL_OTHER_COUNT=$(wc -l < "$FAIL_OTHER_COUNT_FILE" | tr -d ' ')
FAIL_OTHER_COUNT=$((FAIL_OTHER_COUNT - 1))
[[ "$FAIL_OTHER_COUNT" -lt 0 ]] && FAIL_OTHER_COUNT=0

TOTAL_PROCESSED=$((SUCCESS_COUNT + FAIL_502_COUNT + FAIL_OTHER_COUNT))
[[ "$TOTAL_PROCESSED" -eq 0 ]] && TOTAL_PROCESSED=1

DOWNTIME_PCT=$(awk -v f="$FAIL_502_COUNT" -v t="$TOTAL_PROCESSED" 'BEGIN { printf "%.2f", (f/t)*100 }')
SUCCESS_PCT=$(awk -v s="$SUCCESS_COUNT" -v t="$TOTAL_PROCESSED" 'BEGIN { printf "%.2f", (s/t)*100 }')

echo ""
echo "=============================================================================="
echo " 📊 DRILL SIMULATION RESULTS & KPIS"
echo " Total Requests:   $TOTAL_PROCESSED"
echo " Successful (OK):  $SUCCESS_COUNT (${SUCCESS_PCT}%)"
echo " HTTP 502/503:     $FAIL_502_COUNT (${DOWNTIME_PCT}%)"
echo " Other Errors:     $FAIL_OTHER_COUNT"
echo " Target Standard:  502/503 Downtime Rate < 0.5% (Target: 0.00%)"
echo "=============================================================================="

# 5. Generate Audit Report
mkdir -p "$(dirname "$REPORT_FILE")" 2>/dev/null || true
cat << EOF > "$REPORT_FILE" 2>/dev/null || true
# Sky-Lux CRM — Pre-Go-Live Simulation Drill & Resilience Audit Report

- **Date:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Target URL:** $TARGET_URL
- **Total In-flight Requests:** $TOTAL_PROCESSED
- **Concurrent Workers:** $CONCURRENCY

## Key Performance Indicators (KPIs)
| Chỉ Số Đo Lường | Kết Quả Thực Tế | Ngưỡng Chuẩn Enterprise | Đánh Giá |
| :--- | :---: | :---: | :---: |
| HTTP 502/503 trong probe | ${DOWNTIME_PCT}% | < 0.5% | Đo trong lần chạy này |
| HTTP response được chấp nhận | ${SUCCESS_PCT}% | Tham khảo | Đo trong lần chạy này |

## Kết Luận Kiểm Toán
Probe này chỉ đo phản hồi HTTP dưới một lượng request đồng thời. Nó không mô phỏng deploy và không xác nhận ACID, SSE, static chunks, backup, hay zero downtime.
EOF

if [[ -f "$REPORT_FILE" ]]; then
  echo "✔ Audit report successfully written to: $REPORT_FILE"
fi

if (( $(echo "$DOWNTIME_PCT < 0.5" | awk '{print ($1)?1:0}') )); then
  echo "✔ Availability probe stayed below the configured 0.5% HTTP 502/503 threshold."
  exit 0
else
  echo "⚠ DRILL WARNING: HTTP 502 error rate exceeded threshold."
  exit 1
fi

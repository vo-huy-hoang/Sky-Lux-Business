#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SOURCE_WRAPPER="$ROOT_DIR/infra/production/skylux-production-deploy"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/skylux-deploy-mock.XXXXXX")"
trap 'rm -rf "$TEST_ROOT"' EXIT

CURRENT_UID="$(id -u)"
CURRENT_GID="$(id -g)"
mkdir -p \
  "$TEST_ROOT/install/sbin" \
  "$TEST_ROOT/install/lib/skylux-production" \
  "$TEST_ROOT/install/etc/skylux" \
  "$TEST_ROOT/install/var/lib/skylux-production" \
  "$TEST_ROOT/install/var/backups/skylux" \
  "$TEST_ROOT/install/run/skylux-production" \
  "$TEST_ROOT/install/usr/bin" \
  "$TEST_ROOT/install/usr/libexec/docker/cli-plugins" \
  "$TEST_ROOT/install/mock-bin"
chmod 700 "$TEST_ROOT" "$TEST_ROOT/install" "$TEST_ROOT/install/etc/skylux" \
  "$TEST_ROOT/install/var/lib/skylux-production" "$TEST_ROOT/install/var/backups/skylux"
chmod 755 "$TEST_ROOT/install/run" "$TEST_ROOT/install/run/skylux-production"

TEST_WRAPPER="$TEST_ROOT/install/sbin/skylux-production-deploy"
TEST_DOCKER="$TEST_ROOT/install/usr/bin/docker"
TEST_CURL="$TEST_ROOT/install/usr/bin/curl"
TEST_OPENSSL="$TEST_ROOT/install/usr/bin/openssl"
TEST_GZIP="$TEST_ROOT/install/usr/bin/gzip"
TEST_COMPOSE="$TEST_ROOT/install/usr/libexec/docker/cli-plugins/docker-compose"
TEST_ENV="$TEST_ROOT/install/etc/skylux/production.env"
TEST_KEY="$TEST_ROOT/install/etc/skylux/deploy-approval.pub"
TEST_STATE="$TEST_ROOT/install/var/lib/skylux-production"
TEST_BACKUPS="$TEST_ROOT/install/var/backups/skylux"
TEST_LOCK="$TEST_ROOT/install/run/skylux-production"

cp "$SOURCE_WRAPPER" "$TEST_WRAPPER"
cp "$ROOT_DIR/infra/production/docker-compose.prod.root.yml" \
  "$TEST_ROOT/install/lib/skylux-production/docker-compose.prod.yml"
REAL_OPENSSL_BIN="$(command -v openssl)"
cat > "$TEST_OPENSSL" <<EOF
#!/bin/bash
if [[ "\$1 \$2 \$3" == "dgst -sha256 -verify" ]]; then
  if [[ "\${MOCK_MARKER_MUST_BE_ABSENT_AT_VERIFY:-}" == 1 \
    && -n "\${MOCK_REQUIRED_MARKER:-}" && -e "\$MOCK_REQUIRED_MARKER" ]]; then
    printf '%s\\n' 'Replay marker was created before approval verification' >&2
    exit 97
  fi
  printf '%s\\n' 'approval-verify' >> "\$MOCK_LOG"
fi
exec "$REAL_OPENSSL_BIN" "\$@"
EOF
REAL_GZIP_BIN="$(command -v gzip)"
cat > "$TEST_GZIP" <<EOF
#!/bin/bash
exec "$REAL_GZIP_BIN" "\$@"
EOF
chmod 755 "$TEST_WRAPPER" "$TEST_OPENSSL" "$TEST_GZIP"
chmod 644 "$TEST_ROOT/install/lib/skylux-production/docker-compose.prod.yml"

python3 - "$TEST_WRAPPER" "$TEST_ROOT/install" "$CURRENT_UID" "$TEST_DOCKER" "$TEST_OPENSSL" "$TEST_CURL" "$TEST_GZIP" <<'PY'
from pathlib import Path
import sys

wrapper, root, uid, docker, openssl, curl, gzip = sys.argv[1:]
path = Path(wrapper)
source = path.read_text()
replacements = {
    'readonly TRUST_ROOT="/"': f'readonly TRUST_ROOT="{root}"',
    'readonly EXPECTED_OWNER_UID=0': f'readonly EXPECTED_OWNER_UID={uid}',
    'readonly EXPECTED_EUID=0': f'readonly EXPECTED_EUID={uid}',
    'readonly WRAPPER_PATH="/usr/local/sbin/skylux-production-deploy"': f'readonly WRAPPER_PATH="{wrapper}"',
    'readonly DOCKER_BIN="/usr/bin/docker"': f'readonly DOCKER_BIN="{docker}"',
    'readonly OPENSSL_BIN="/usr/bin/openssl"': f'readonly OPENSSL_BIN="{openssl}"',
    'readonly CURL_BIN="/usr/bin/curl"': f'readonly CURL_BIN="{curl}"',
    'readonly GZIP_BIN="/usr/bin/gzip"': f'readonly GZIP_BIN="{gzip}"',
    'readonly COMPOSE_FILE="/usr/local/lib/skylux-production/docker-compose.prod.yml"': f'readonly COMPOSE_FILE="{root}/lib/skylux-production/docker-compose.prod.yml"',
    'readonly ENV_FILE="/etc/skylux/production.env"': f'readonly ENV_FILE="{root}/etc/skylux/production.env"',
    'readonly APPROVAL_KEY="/etc/skylux/deploy-approval.pub"': f'readonly APPROVAL_KEY="{root}/etc/skylux/deploy-approval.pub"',
    'readonly STATE_DIR="/var/lib/skylux-production"': f'readonly STATE_DIR="{root}/var/lib/skylux-production"',
    'readonly STATUS_FILE="/var/lib/skylux-production/status"': f'readonly STATUS_FILE="{root}/var/lib/skylux-production/status"',
    'readonly BACKUP_DIR="/var/backups/skylux"': f'readonly BACKUP_DIR="{root}/var/backups/skylux"',
    'readonly LOCK_DIR="/run/skylux-production"': f'readonly LOCK_DIR="{root}/run/skylux-production"',
    'readonly LOCK_PATH="/run/skylux-production/active"': f'readonly LOCK_PATH="{root}/run/skylux-production/active"',
    'PATH="/usr/sbin:/usr/bin:/sbin:/bin"': f'PATH="{root}/mock-bin:/usr/bin:/bin"',
}
for old, new in replacements.items():
    if old not in source:
        raise SystemExit(f"test patch point missing: {old}")
    source = source.replace(old, new)
path.write_text(source)
PY

cat > "$TEST_ENV" <<'EOF'
DB_NAME=skylux
DB_USER=skylux
DB_PASSWORD=MOCK_DATABASE_PASSWORD
JWT_SECRET=MOCK_JWT_SECRET
APP_VERSION=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
REGISTRY_OWNER=vo-huy-hoang
EOF
chmod 600 "$TEST_ENV"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$TEST_ROOT/approval-private.pem" >/dev/null 2>&1
openssl pkey -in "$TEST_ROOT/approval-private.pem" -pubout -out "$TEST_KEY" >/dev/null 2>&1
chmod 600 "$TEST_KEY"

cat > "$TEST_DOCKER" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf 'docker %s\n' "$*" >> "$MOCK_LOG"
if [[ -n "${MOCK_REQUIRED_MARKER:-}" && ! -f "$MOCK_REQUIRED_MARKER" ]]; then
  printf '%s\n' 'Docker was called before the replay marker existed' >&2
  exit 98
fi
if [[ "$1" == info ]]; then
  printf '%s\n' "$MOCK_COMPOSE_PLUGIN"
  exit 0
fi
if [[ "$1" == login ]]; then
  IFS= read -r token || [[ -n "$token" ]]
  [[ -n "$token" ]]
  exit 0
fi
if [[ "$1" == image && "$2" == inspect ]]; then
  if [[ "${MOCK_MISSING_IMAGE:-}" == backend && "$3" == *skylux-backend:* ]]; then exit 1; fi
  exit 0
fi
if [[ "$1" == inspect ]]; then
  if [[ "$2" == -f ]]; then format="$3"; id="$4"; else format="$2"; id="$3"; fi
  if [[ "$format" == *State.Health.Status* ]]; then
    if [[ "${MOCK_FAIL:-}" == unhealthy && ( "$id" == frontend-id || "$id" == backend-id ) ]]; then
      echo unhealthy
    else
      echo healthy
    fi
  else
    if [[ "$id" == frontend-id ]]; then echo ghcr.io/vo-huy-hoang/skylux-frontend:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    elif [[ "$id" == backend-id ]]; then echo ghcr.io/vo-huy-hoang/skylux-backend:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    else exit 2; fi
  fi
  exit
fi
if [[ "$1" != compose ]]; then exit 2; fi
shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    pull|ps|exec|run|up) action="$1"; shift; break ;;
    *) shift ;;
  esac
done
case "${action:-}" in
  pull)
    if [[ -n "${MOCK_PULL_STARTED:-}" ]]; then : > "$MOCK_PULL_STARTED"; fi
    if [[ "${MOCK_HOLD_PULL:-}" == 1 ]]; then
      while [[ ! -e "$MOCK_PULL_RELEASE" ]]; do /bin/sleep 0.05; done
    fi
    [[ "${MOCK_FAIL:-}" != pull ]]
    ;;
  ps)
    [[ "${1:-}" == -q ]] || exit 2
    case "${2:-}" in postgres) echo postgres-id;; redis) echo redis-id;; frontend) echo frontend-id;; backend) echo backend-id;; esac
    ;;
  exec)
    if [[ "${MOCK_FAIL:-}" == backup ]]; then exit 3; fi
    printf 'mock PostgreSQL dump\n'
    ;;
  run) [[ "${MOCK_FAIL:-}" != migration ]] ;;
  up)
    printf 'compose-up %s\n' "$*" >> "$MOCK_LOG"
    [[ "${MOCK_FAIL:-}" != app-update ]]
    ;;
  *) exit 2 ;;
esac
MOCK

cat > "$TEST_CURL" <<'MOCK'
#!/bin/bash
printf 'curl %s\n' "$*" >> "$MOCK_LOG"
printf '%s' "${MOCK_HTTP_STATUS:-200}"
MOCK
cat > "$TEST_ROOT/install/mock-bin/sleep" <<'MOCK'
#!/bin/bash
exit 0
MOCK
cat > "$TEST_ROOT/install/mock-bin/sudo" <<'MOCK'
#!/bin/bash
printf 'sudo %s\n' "$*" >> "$MOCK_LOG"
[[ "$1" == -n && "$2" == "$MOCK_WRAPPER_PATH" && "$3" == "$MOCK_TARGET_SHA" ]]
cat > "$MOCK_STDIN_CAPTURE"
MOCK

chmod 755 "$TEST_DOCKER" "$TEST_CURL" "$TEST_ROOT/install/mock-bin/sleep" "$TEST_ROOT/install/mock-bin/sudo"
printf '#!/bin/sh\nexit 0\n' > "$TEST_COMPOSE"
chmod 755 "$TEST_COMPOSE"

MOCK_LOG="$TEST_ROOT/commands.log"
export MOCK_LOG MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE"
export PATH="$TEST_ROOT/install/mock-bin:/usr/bin:/bin"

issue_ticket() {
  local sha="$1" run_id="$2" timestamp="${3:-}" signature message message_file signature_file
  timestamp="${timestamp:-$(date -u +%s)}"
  message="$(printf 'SKYLUX_PRODUCTION_DEPLOY_V1\n%s\n%s\n%s' "$sha" "$timestamp" "$run_id")"
  message_file="$TEST_ROOT/message-$run_id"
  signature_file="$TEST_ROOT/signature-$run_id"
  printf '%s' "$message" > "$message_file"
  openssl dgst -sha256 -sign "$TEST_ROOT/approval-private.pem" -out "$signature_file" "$message_file"
  signature="$(openssl base64 -A -in "$signature_file")"
  printf 'github-actor\nmock-ghcr-token\n%s\n%s\n%s\n' "$timestamp" "$run_id" "$signature"
}

run_case() {
  local label="$1" sha="$2" run_id="$3" fail_kind="${4:-}" expected="$5" missing_image="${6:-}" http_status="${7:-200}" rc
  : > "$MOCK_LOG"
  set +e
  issue_ticket "$sha" "$run_id" | env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" MOCK_REQUIRED_MARKER="$TEST_STATE/used-run-$run_id" MOCK_MARKER_MUST_BE_ABSENT_AT_VERIFY=1 MOCK_FAIL="$fail_kind" MOCK_MISSING_IMAGE="$missing_image" MOCK_HTTP_STATUS="$http_status" \
    "$TEST_WRAPPER" "$sha" > "$TEST_ROOT/output" 2>&1
  rc=$?
  set -e
  case "$expected" in
    success)
      [[ $rc -eq 0 ]] || { cat "$TEST_ROOT/output"; return 1; }
      local verify_line docker_line
      verify_line="$(grep -n '^approval-verify$' "$MOCK_LOG" | head -n 1 | cut -d: -f1)"
      docker_line="$(grep -n '^docker ' "$MOCK_LOG" | head -n 1 | cut -d: -f1)"
      [[ -n "$verify_line" && -n "$docker_line" && "$verify_line" -lt "$docker_line" ]] || return 1
      grep -q '^status=succeeded$' "$TEST_STATE/status" || return 1
      grep -q '^previous_version=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa$' "$TEST_STATE/status" || return 1
      grep -q '^target_version=0123456789abcdef0123456789abcdef01234567$' "$TEST_STATE/status" || return 1
      grep -q 'backup_path=/.*\.sql\.gz' "$TEST_STATE/status" || return 1
      ! grep -Eq '^compose-up .*postgres|^compose-up .*redis' "$MOCK_LOG" || return 1
      ;;
    rejected)
      [[ $rc -ne 0 ]] || { cat "$TEST_ROOT/output"; return 1; }
      grep -q '^status=failed$' "$TEST_STATE/status" || { cat "$TEST_ROOT/output"; return 1; }
      ;;
    preflight-rejected)
      [[ $rc -ne 0 ]] || { cat "$TEST_ROOT/output"; return 1; }
      ;;
  esac
  printf '%s: exit=%s passed\n' "$label" "$rc"
}

GOOD_SHA="0123456789abcdef0123456789abcdef01234567"
BAD_SHA="latest"

: > "$MOCK_LOG"
set +e
"$TEST_WRAPPER" "$BAD_SHA" </dev/null > "$TEST_ROOT/output" 2>&1
rc=$?
set -e
[[ $rc -ne 0 && ! -s "$MOCK_LOG" ]]
printf '%s\n' 'invalid SHA: rejected before Docker'

: > "$MOCK_LOG"
MOCK_STDIN_CAPTURE="$TEST_ROOT/client-stdin"
issue_ticket "$GOOD_SHA" 999999-1 | env MOCK_LOG="$MOCK_LOG" MOCK_STDIN_CAPTURE="$MOCK_STDIN_CAPTURE" \
  MOCK_WRAPPER_PATH="/usr/local/sbin/skylux-production-deploy" MOCK_TARGET_SHA="$GOOD_SHA" \
  bash "$ROOT_DIR/infra/scripts/deploy.sh" "$GOOD_SHA" vo-huy-hoang
grep -q "sudo -n /usr/local/sbin/skylux-production-deploy $GOOD_SHA" "$MOCK_LOG"
[[ -s "$MOCK_STDIN_CAPTURE" ]]
printf '%s\n' 'unprivileged deploy client: fixed wrapper and stdin forwarded'

: > "$MOCK_LOG"
set +e
issue_ticket "$GOOD_SHA" 100000-1 | env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" \
  MOCK_REQUIRED_MARKER="$TEST_STATE/used-run-100000-1" MOCK_MARKER_MUST_BE_ABSENT_AT_VERIFY=1 \
  "$TEST_WRAPPER" "abcdef0123456789abcdef0123456789abcdef01" > "$TEST_ROOT/output" 2>&1
rc=$?
set -e
[[ $rc -ne 0 && ! -e "$TEST_STATE/used-run-100000-1" && ! -e "$TEST_LOCK/active" ]]
! grep -q '^docker ' "$MOCK_LOG"
! grep -q 'mock-ghcr-token\|MOCK_DATABASE_PASSWORD\|MOCK_JWT_SECRET' "$TEST_ROOT/output"
printf '%s\n' 'invalid approval signature: rejected before Docker'

EXPIRED_TIMESTAMP="$(( $(date -u +%s) - 301 ))"
: > "$MOCK_LOG"
set +e
issue_ticket "$GOOD_SHA" 100016-1 "$EXPIRED_TIMESTAMP" | env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" \
  "$TEST_WRAPPER" "$GOOD_SHA" > "$TEST_ROOT/output" 2>&1
rc=$?
set -e
[[ $rc -ne 0 && ! -s "$MOCK_LOG" && ! -e "$TEST_STATE/used-run-100016-1" && ! -e "$TEST_LOCK/active" ]]
printf '%s\n' 'expired approval ticket: rejected before Docker and replay marker'

grep -q 'skylux-deploy ALL=(root) NOPASSWD: /usr/local/sbin/skylux-production-deploy \^\[\[:xdigit:\]\]{40}\$' \
  "$ROOT_DIR/infra/production/skylux-production.sudoers"
! grep -q '^ops ' "$ROOT_DIR/infra/production/skylux-production.sudoers"
printf '%s\n' 'restricted sudoers identity and command: verified'

DISABLED_WORKFLOW="$ROOT_DIR/.github/workflows/deploy.yml"
grep -q '^  workflow_dispatch:$' "$DISABLED_WORKFLOW"
grep -q 'Production deployment is disabled' "$DISABLED_WORKFLOW"
grep -q 'exit 1' "$DISABLED_WORKFLOW"
! grep -Eq 'appleboy/(ssh|scp)-action|build-push-action|VPS_HOST|VPS_SSH_KEY|infra/scripts/deploy\.sh' "$DISABLED_WORKFLOW"
printf '%s\n' 'legacy production workflow: disabled without build or SSH'

cp "$TEST_ENV" "$TEST_ROOT/original.env"
sed -i.bak 's/REGISTRY_OWNER=vo-huy-hoang/REGISTRY_OWNER=someone-else/' "$TEST_ENV"
run_case 'invalid registry owner' "$GOOD_SHA" 100001-1 '' preflight-rejected
cp "$TEST_ROOT/original.env" "$TEST_ENV"
rm -f "$TEST_ENV.bak"

run_case 'image pull failure' "$GOOD_SHA" 100017-1 pull rejected
! grep -Eq 'image inspect|exec -T postgres|run --rm' "$MOCK_LOG"
run_case 'missing backend image' "$GOOD_SHA" 100002-1 '' rejected backend
grep -q '^status=failed$' "$TEST_STATE/status" || { cat "$TEST_ROOT/output"; exit 1; }
run_case 'backup failure' "$GOOD_SHA" 100003-1 backup rejected
! grep -q 'run --rm' "$MOCK_LOG"
run_case 'migration failure' "$GOOD_SHA" 100004-1 migration rejected
grep -q '^status=failed$' "$TEST_STATE/status"
grep -q 'partial or complete' "$TEST_ROOT/output" || { cat "$TEST_ROOT/output"; exit 1; }
! grep -q 'compose-up' "$MOCK_LOG"
run_case 'unhealthy application' "$GOOD_SHA" 100005-1 unhealthy rejected
run_case 'HTTP redirect 301' "$GOOD_SHA" 100006-1 '' rejected '' 301
run_case 'HTTP redirect 302' "$GOOD_SHA" 100012-1 '' rejected '' 302
run_case 'HTTP 404' "$GOOD_SHA" 100013-1 '' rejected '' 404
run_case 'HTTP 500' "$GOOD_SHA" 100014-1 '' rejected '' 500
run_case 'HTTP 200' "$GOOD_SHA" 100007-1 '' success '' 200
grep -q 'http://127.0.0.1:3001/api/health' "$MOCK_LOG"
grep -q 'http://127.0.0.1:3002/login' "$MOCK_LOG"
! grep -q 'curl .* -L\|curl .* --location' "$MOCK_LOG"
grep -q '127.0.0.1:3000/login' "$ROOT_DIR/infra/production/docker-compose.prod.root.yml"
! grep -Eq 'auth/login|localhost:3000/' "$ROOT_DIR/infra/production/docker-compose.prod.root.yml"
! grep -q 'SECRET\|PASSWORD\|TOKEN' "$TEST_ROOT/output"
grep -q 'name: skylux_postgres_data' "$TEST_ROOT/install/lib/skylux-production/docker-compose.prod.yml"
grep -q 'name: skylux_redis_data' "$TEST_ROOT/install/lib/skylux-production/docker-compose.prod.yml"
grep -q 'name: skylux_skylux' "$TEST_ROOT/install/lib/skylux-production/docker-compose.prod.yml"

# Replaying the same signed ticket is rejected before any Docker command.
REPLAY_RUN_ID="100015-1"
REPLAY_TICKET="$TEST_ROOT/replay-ticket"
issue_ticket "$GOOD_SHA" "$REPLAY_RUN_ID" > "$REPLAY_TICKET"
REPLAY_MARKER="$TEST_STATE/used-run-$REPLAY_RUN_ID"
: > "$MOCK_LOG"
set +e
env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" MOCK_REQUIRED_MARKER="$REPLAY_MARKER" MOCK_MARKER_MUST_BE_ABSENT_AT_VERIFY=1 \
  "$TEST_WRAPPER" "$GOOD_SHA" < "$REPLAY_TICKET" > "$TEST_ROOT/output" 2>&1
first_replay_rc=$?
set -e
[[ $first_replay_rc -eq 0 && -f "$REPLAY_MARKER" ]]
: > "$MOCK_LOG"
set +e
env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" MOCK_REQUIRED_MARKER="$REPLAY_MARKER" \
  "$TEST_WRAPPER" "$GOOD_SHA" < "$REPLAY_TICKET" > "$TEST_ROOT/output" 2>&1
second_replay_rc=$?
set -e
[[ $second_replay_rc -ne 0 ]]
! grep -q '^docker ' "$MOCK_LOG"
grep -q 'already used' "$TEST_ROOT/output"
! grep -q 'mock-ghcr-token\|MOCK_DATABASE_PASSWORD\|MOCK_JWT_SECRET' "$TEST_ROOT/output"
printf '%s\n' 'approval replay: first accepted, reuse rejected before Docker'

# A group/world writable protected secret config must fail before any Docker call.
chmod 640 "$TEST_ENV"
: > "$MOCK_LOG"
set +e
issue_ticket "$GOOD_SHA" 100008-1 | "$TEST_WRAPPER" "$GOOD_SHA" > "$TEST_ROOT/output" 2>&1
rc=$?
set -e
[[ $rc -ne 0 && ! -s "$MOCK_LOG" ]]
chmod 600 "$TEST_ENV"
printf '%s\n' 'unsafe environment permissions: rejected before Docker'

# A different expected owner models a root-owned-file ownership mismatch.
sed -i.bak "s/readonly EXPECTED_OWNER_UID=$CURRENT_UID/readonly EXPECTED_OWNER_UID=$((CURRENT_UID + 1))/" "$TEST_WRAPPER"
: > "$MOCK_LOG"
set +e
issue_ticket "$GOOD_SHA" 100009-1 | "$TEST_WRAPPER" "$GOOD_SHA" > "$TEST_ROOT/output" 2>&1
rc=$?
set -e
[[ $rc -ne 0 && ! -s "$MOCK_LOG" ]]
mv "$TEST_WRAPPER.bak" "$TEST_WRAPPER"
printf '%s\n' 'unexpected protected-file owner: rejected before Docker'

# Hold the first invocation during pull; the concurrent second invocation must
# fail on the atomic root-owned lock without reaching Docker.
PULL_STARTED="$TEST_ROOT/pull-started"
PULL_RELEASE="$TEST_ROOT/pull-release"
rm -f "$PULL_STARTED" "$PULL_RELEASE"
: > "$MOCK_LOG"
issue_ticket "$GOOD_SHA" 100010-1 | env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" MOCK_HOLD_PULL=1 \
  MOCK_PULL_STARTED="$PULL_STARTED" MOCK_PULL_RELEASE="$PULL_RELEASE" "$TEST_WRAPPER" "$GOOD_SHA" \
  > "$TEST_ROOT/first.out" 2>&1 &
first_pid=$!
for _ in {1..100}; do [[ -e "$PULL_STARTED" ]] && break; /bin/sleep 0.05; done
[[ -e "$PULL_STARTED" ]]
set +e
issue_ticket "$GOOD_SHA" 100011-1 | env MOCK_LOG="$MOCK_LOG" MOCK_COMPOSE_PLUGIN="$TEST_COMPOSE" \
  "$TEST_WRAPPER" "$GOOD_SHA" > "$TEST_ROOT/second.out" 2>&1
second_rc=$?
set -e
[[ $second_rc -eq 75 ]]
: > "$PULL_RELEASE"
wait "$first_pid"
printf '%s\n' 'concurrent deployment: second invocation rejected by lock'

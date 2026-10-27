#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:-ghcr.io/vo-huy-hoang/skylux-frontend:local}"
TEST_PREFIX="skylux-static-assets-test-$$"
BASE_PORT="${STATIC_ASSET_TEST_PORT:-3000}"
VOLUMES=()
CONTAINERS=()
TEMP_DIR="$(mktemp -d)"

cleanup() {
  local container volume
  for container in "${CONTAINERS[@]}"; do docker rm -f "$container" >/dev/null 2>&1 || true; done
  for volume in "${VOLUMES[@]}"; do docker volume rm "$volume" >/dev/null 2>&1 || true; done
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

new_volume() {
  local volume="$TEST_PREFIX-$1"
  docker volume create "$volume" >/dev/null
  VOLUMES+=("$volume")
  REPLY_VOLUME="$volume"
}

assert_assets_match_build() {
  local volume="$1"
  docker run --rm --user 0 --volume "$volume:/volume" --entrypoint sh "$IMAGE" -c '
    set -eu
    count=0
    while IFS= read -r source_file; do
      relative=${source_file#/app/static-dist/}
      test -f "/volume/$relative" || { echo "missing asset: $relative" >&2; exit 1; }
      cmp -s "$source_file" "/volume/$relative" || { echo "asset content mismatch: $relative" >&2; exit 1; }
      count=$((count + 1))
    done <<EOF
$(find /app/static-dist -type f -print)
EOF
    test "$count" -gt 0
  '
}

start_app() {
  local volume="$1" name="$2" readonly="${3:-false}"
  local mount="type=volume,source=$volume,target=/app/.next/static"
  local port
  CONTAINERS+=("$name")
  if [[ "$readonly" == true ]]; then mount+=",readonly"; fi
  docker run -d --name "$name" --publish "127.0.0.1::$BASE_PORT" \
    --mount "$mount" "$IMAGE" > /dev/null
  port="$(docker port "$name" "$BASE_PORT/tcp" | sed 's/.*://')"
  TEST_PORT="$port"
}

wait_for_login() {
  local base="$1" container="$2"
  for _ in {1..40}; do
    if curl --silent --fail "$base/login" -o "$TEMP_DIR/login.html"; then return 0; fi
    sleep 1
  done
  docker logs "$container" >&2 || true
  return 1
}

http_smoke() {
  local base="$1"
  node - "$base" <<'NODE'
const base = process.argv[2];
const mimeFor = (path) => path.endsWith('.js') ? /javascript|ecmascript/i
  : path.endsWith('.css') ? /text\/css/i
  : path.endsWith('.png') ? /image\/png/i
  : path.endsWith('.svg') ? /image\/svg\+xml/i
  : path.endsWith('.ico') ? /image\/x-icon|image\/vnd\.microsoft\.icon/i
  : null;
(async () => {
  const page = await fetch(`${base}/login`);
  if (page.status !== 200) throw new Error(`/login returned HTTP ${page.status}`);
  const html = await page.text();
  const refs = new Set();
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const url = new URL(match[1], base);
    if (url.origin !== new URL(base).origin) continue;
    if (/\.js(?:\?|$)|\.css(?:\?|$)|^\/_next\/static\/|^\/logo\//i.test(url.pathname)) refs.add(url.href);
  }
  const assets = [...refs];
  const javascript = assets.filter((asset) => new URL(asset).pathname.endsWith('.js'));
  if (javascript.length === 0) throw new Error('/login did not reference any JavaScript assets');
  for (const asset of assets) {
    const response = await fetch(asset);
    const pathname = new URL(asset).pathname;
    if (response.status !== 200) throw new Error(`${pathname} returned HTTP ${response.status}`);
    const expected = mimeFor(pathname);
    const actual = response.headers.get('content-type') || '';
    if (expected && !expected.test(actual)) throw new Error(`${pathname} has unexpected Content-Type: ${actual}`);
    if (pathname.endsWith('.js') && !/javascript|ecmascript/i.test(actual)) {
      throw new Error(`${pathname} has unexpected JavaScript Content-Type: ${actual}`);
    }
    console.log(`HTTP ${response.status} ${actual} ${pathname}`);
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
NODE
}

docker image inspect "$IMAGE" >/dev/null

# Case A: a fresh volume receives every file from this image and serves login assets.
new_volume fresh
FRESH_VOLUME="$REPLY_VOLUME"
start_app "$FRESH_VOLUME" "$TEST_PREFIX-fresh"
PORT="$TEST_PORT"
BASE="http://127.0.0.1:$PORT"
wait_for_login "$BASE" "$TEST_PREFIX-fresh"
assert_assets_match_build "$FRESH_VOLUME"
http_smoke "$BASE"
docker rm -f "$TEST_PREFIX-fresh" >/dev/null
printf '%s\n' 'Case A (fresh volume): passed'

# Case B and C: prior chunks survive, while same-path assets are replaced.
new_volume old
OLD_VOLUME="$REPLY_VOLUME"
docker run --rm --user 0 --volume "$OLD_VOLUME:/volume" --entrypoint sh "$IMAGE" -c '
  set -eu
  source_file="$(find /app/static-dist -type f -name "*.js" | head -n 1)"
  relative=${source_file#/app/static-dist/}
  mkdir -p "/volume/$(dirname "$relative")" /volume/chunks
  printf "%s\n" "stale conflicting contents" > "/volume/$relative"
  chmod 666 "/volume/$relative"
  printf "%s\n" "previous-build-only chunk" > /volume/chunks/webpack-previous-build.js
  chown -R 1001:65533 /volume
'
start_app "$OLD_VOLUME" "$TEST_PREFIX-old"
PORT="$TEST_PORT"
BASE="http://127.0.0.1:$PORT"
wait_for_login "$BASE" "$TEST_PREFIX-old"
assert_assets_match_build "$OLD_VOLUME"
docker run --rm --user 0 --volume "$OLD_VOLUME:/volume" --entrypoint sh "$IMAGE" -c \
  'test "$(cat /volume/chunks/webpack-previous-build.js)" = "previous-build-only chunk"'
http_smoke "$BASE"
docker rm -f "$TEST_PREFIX-old" >/dev/null
printf '%s\n' 'Case B (old volume) and Case C (same-path overwrite): passed'

# Case D: a read-only volume models a static volume that cannot be written by nextjs.
new_volume readonly
READONLY_VOLUME="$REPLY_VOLUME"
CONTAINERS+=("$TEST_PREFIX-readonly")
docker run -d --name "$TEST_PREFIX-readonly" \
  --mount "type=volume,source=$READONLY_VOLUME,target=/app/.next/static,readonly" \
  "$IMAGE" >"$TEMP_DIR/readonly.id"
for _ in {1..20}; do
  [[ "$(docker inspect -f '{{.State.Status}}' "$TEST_PREFIX-readonly")" == exited ]] && break
  sleep 0.25
done
if [[ "$(docker inspect -f '{{.State.Status}}' "$TEST_PREFIX-readonly")" != exited ]]; then
  echo 'Case D failed: container remained running with a read-only static volume' >&2
  exit 1
fi
[[ "$(docker inspect -f '{{.State.ExitCode}}' "$TEST_PREFIX-readonly")" != 0 ]] || {
  echo 'Case D failed: container exited successfully with a read-only static volume' >&2
  exit 1
}
docker logs "$TEST_PREFIX-readonly" >"$TEMP_DIR/readonly.out" 2>&1 || true
grep -Eq 'not writable|synchronization failed|permissions' "$TEMP_DIR/readonly.out" || {
  cat "$TEMP_DIR/readonly.out" >&2
  echo 'Case D failed: permission error was not diagnosed clearly' >&2
  exit 1
}
printf '%s\n' 'Case D (permission error): passed'

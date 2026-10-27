#!/bin/sh
set -eu

STATIC_SOURCE="/app/static-dist"
STATIC_TARGET="/app/.next/static"

if [ ! -d "$STATIC_SOURCE" ]; then
  printf '%s\n' "ERROR: build static assets directory is missing: $STATIC_SOURCE" >&2
  exit 1
fi

mkdir -p "$STATIC_TARGET" || {
  printf '%s\n' "ERROR: cannot access static volume at $STATIC_TARGET; check its ownership and permissions for uid $(id -u), gid $(id -g)." >&2
  exit 1
}

# Fail early with a clear permissions diagnostic. Keep this probe in the mounted
# directory so it checks the actual volume, without changing its ownership.
WRITE_PROBE="$(mktemp "$STATIC_TARGET/.skylux-write-test.XXXXXX" 2>/dev/null)" || {
  printf '%s\n' "ERROR: static volume is not writable by uid $(id -u), gid $(id -g): $STATIC_TARGET" >&2
  exit 1
}
rm -f "$WRITE_PROBE" || {
  printf '%s\n' "ERROR: cannot remove static volume write probe; check permissions: $STATIC_TARGET" >&2
  exit 1
}

# Plain recursive cp overwrites same-path assets from the current build while
# leaving files that exist only in older builds untouched. Do not hide errors.
if ! cp -R "$STATIC_SOURCE/." "$STATIC_TARGET/"; then
  printf '%s\n' "ERROR: static asset synchronization failed; check volume ownership and permissions for uid $(id -u), gid $(id -g)." >&2
  exit 1
fi

# Validate every asset shipped by this build, including JS chunks, CSS and
# referenced fonts/images. This avoids relying on hashed filenames or a partial
# manifest that differs between Next.js App Router versions.
asset_count=0
javascript_count=0
while IFS= read -r source_file; do
  relative_path=${source_file#"$STATIC_SOURCE"/}
  target_file="$STATIC_TARGET/$relative_path"
  if [ ! -f "$target_file" ]; then
    printf '%s\n' "ERROR: required static asset is missing after synchronization: $relative_path" >&2
    exit 1
  fi
  if ! cmp -s "$source_file" "$target_file"; then
    printf '%s\n' "ERROR: static asset content does not match the current build: $relative_path" >&2
    exit 1
  fi
  asset_count=$((asset_count + 1))
  case "$relative_path" in
    *.js) javascript_count=$((javascript_count + 1)) ;;
  esac
done <<EOF
$(find "$STATIC_SOURCE" -type f -print)
EOF

if [ "$asset_count" -eq 0 ] || [ "$javascript_count" -eq 0 ]; then
  printf '%s\n' "ERROR: build static assets are incomplete (files=$asset_count, javascript=$javascript_count)." >&2
  exit 1
fi

exec "$@"

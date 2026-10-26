#!/usr/bin/env bash
# Unprivileged entry point used by SSH automation. The privileged work is
# performed only by the separately installed root-owned wrapper.

set -euo pipefail

WRAPPER="/usr/local/sbin/skylux-production-deploy"
TARGET_VERSION="${1:-}"
REGISTRY_OWNER="vo-huy-hoang"

if (( $# < 1 || $# > 2 )); then
  printf '%s\n' "Usage: bash infra/scripts/deploy.sh <40-character-commit-sha> [vo-huy-hoang]" >&2
  exit 2
fi
if [[ ! "$TARGET_VERSION" =~ ^[[:xdigit:]]{40}$ ]]; then
  printf '%s\n' 'ERROR: Target version must be a full 40-character hexadecimal Git commit SHA.' >&2
  exit 2
fi
if (( $# == 2 )) && [[ "$2" != "$REGISTRY_OWNER" ]]; then
  printf '%s\n' 'ERROR: Registry owner must be vo-huy-hoang.' >&2
  exit 2
fi

# stdin is forwarded unchanged: the approved workflow supplies a signed
# deployment ticket and a short-lived GHCR token for the root-owned wrapper.
exec sudo -n "$WRAPPER" "$TARGET_VERSION"

#!/bin/sh
set -e

# ==============================================================================
# Sky-Lux CRM — Next.js Container Entrypoint
# Accumulative static assets sync for zero-ChunkLoadError deployments
# ==============================================================================

# Ensure target static directory exists
mkdir -p /app/.next/static

# Sync new build assets into persistent volume without deleting older chunks
if [ -d "/app/static-dist" ]; then
  # cp -rn will not overwrite identical existing files, preserving timestamps
  # If cp -n is unsupported, fallback to regular copy
  cp -rn /app/static-dist/. /app/.next/static/ 2>/dev/null || cp -r /app/static-dist/. /app/.next/static/
fi

# Clean up static files older than 7 days to prevent unbounded disk usage
find /app/.next/static -type f -mtime +7 -delete 2>/dev/null || true

# Execute the primary container command (node server.js)
exec "$@"

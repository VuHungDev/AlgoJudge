#!/usr/bin/env bash
# deploy.sh — rebuild và restart các service có thay đổi code
set -e

cd "$(dirname "$0")"

echo "==> Rebuilding web..."
docker compose build web

echo "==> Restarting web..."
docker compose up -d web

echo "==> Done. http://localhost:3001"

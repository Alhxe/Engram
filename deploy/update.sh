#!/bin/bash
# Poll GHCR for a newer backend image and redeploy if it changed. Invoked on a
# timer by the com.engram.update LaunchAgent. Uses the working Docker CLI (unlike
# watchtower, which can't talk to the Docker Engine 29 API). Safe to run often:
# `compose up -d` only recreates the container when the pulled image differs.
set -uo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR" || exit 0
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Docker not up yet (Docker Desktop still starting) -> try again next tick.
docker info >/dev/null 2>&1 || exit 0

before="$(docker inspect --format '{{.Image}}' engram-backend 2>/dev/null || echo none)"
docker compose pull --quiet backend >/dev/null 2>&1 || exit 0
docker compose up -d backend >/dev/null 2>&1 || exit 0
after="$(docker inspect --format '{{.Image}}' engram-backend 2>/dev/null || echo none)"

if [ "$before" != "$after" ]; then
  echo "$(date '+%Y-%m-%dT%H:%M:%S') updated backend: ${before#sha256:} -> ${after#sha256:}"
fi
exit 0

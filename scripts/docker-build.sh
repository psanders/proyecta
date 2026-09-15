#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Builds the proyecta-apiserver, proyecta-dashboard and proyecta-player Docker
# images, one at a time (not in parallel — this keeps peak memory down on
# machines under memory pressure; run `docker builder prune -f` between builds
# if a build fails with an out-of-memory-flavored error).
#
# Usage:
#   ./scripts/docker-build.sh [--tag <tag>]
#
# Options:
#   --tag   Image tag suffix, e.g. "v1.2.0" (default: "latest")
set -euo pipefail

TAG="latest"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "── Building Docker images (tag: $TAG) ──"

docker build --target apiserver -t "proyecta-apiserver:$TAG" .
docker build --target dashboard -t "proyecta-dashboard:$TAG" .
docker build --target player    -t "proyecta-player:$TAG"    .

echo ""
echo "Done."
echo "  proyecta-apiserver:$TAG"
echo "  proyecta-dashboard:$TAG"
echo "  proyecta-player:$TAG"

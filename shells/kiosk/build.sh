#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Builds the kiosk artifacts into shells/kiosk/build/: the helper for linux/amd64, linux/arm64 and
# windows/amd64, then one .deb per Linux architecture (needs nfpm). The Windows installer is built
# on Windows from windows/proyecta-kiosk.iss (see .github/workflows/release.yml).
# Usage: shells/kiosk/build.sh [version]   (defaults to the repo's package.json version)
set -euo pipefail

cd "$(dirname "$0")"
REPO="$(cd ../.. && pwd)"
VERSION="${1:-$(node -p "require('$REPO/package.json').version")}"

echo "Building the player"
(cd "$REPO" && npm run build -w @proyecta/player)

for target in linux/amd64 linux/arm64 windows/amd64; do
  os="${target%/*}"
  arch="${target#*/}"
  out="build/$os-$arch/proyecta-helper"
  [ "$os" = windows ] && out="$out.exe"
  echo "Building the helper for $target"
  (cd helper && CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" \
    go build -trimpath -ldflags "-s -w -X main.version=$VERSION" -o "../$out" .)
done

if command -v nfpm >/dev/null; then
  for arch in amd64 arm64; do
    mkdir -p build/stage
    cp "build/linux-$arch/proyecta-helper" build/stage/proyecta-helper
    ARCH="$arch" VERSION="$VERSION" nfpm package --config linux/nfpm.yaml --packager deb --target build/
  done
else
  echo "nfpm not found: skipping the .deb packages (https://nfpm.goreleaser.com/install/)" >&2
fi

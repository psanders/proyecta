#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Runs ON the droplet, piped over SSH by .github/workflows/deploy.yml
# (`ssh ... bash -s < this file`, with the variables below exported first so
# the registry token never appears on a command line). Pins PROYECTA_VERSION,
# pulls and starts the stack, rolls back if containers don't come up.
#
# Required environment: VERSION, COMPOSE_DIR, GHCR_TOKEN, GHCR_OWNER.
set -eu
: "${VERSION:?}" "${COMPOSE_DIR:?}" "${GHCR_TOKEN:?}" "${GHCR_OWNER:?}"
cd "$COMPOSE_DIR"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_OWNER" --password-stdin

# Pin PROYECTA_VERSION in .env, remembering the previous value for rollback.
touch .env
prev=$(grep '^PROYECTA_VERSION=' .env | cut -d= -f2- || true)
grep -v '^PROYECTA_VERSION=' .env > .env.next || true
echo "PROYECTA_VERSION=${VERSION}" >> .env.next
mv .env.next .env

docker compose pull apiserver dashboard player
docker compose up -d
# The proxy isn't recreated when only the app images change. Restart it so it renders the
# freshly synced proxy.conf.template and drops any upstream IPs cached before the recreate.
docker compose restart proxy

# Wait up to 60s for every service to be running/healthy.
ok=""
for _ in $(seq 1 30); do
  stopped=$(docker compose ps --status exited --quiet 2>/dev/null | wc -l)
  starting=$(docker compose ps --status starting --quiet 2>/dev/null | wc -l)
  if [ "$stopped" = "0" ] && [ "$starting" = "0" ]; then
    ok=1
    break
  fi
  sleep 2
done

if [ -z "$ok" ]; then
  echo "Deploy of ${VERSION} failed — containers did not come up cleanly." >&2
  docker compose ps
  docker compose logs --tail 50
  if [ -n "$prev" ]; then
    echo "Rolling back to ${prev}." >&2
    grep -v '^PROYECTA_VERSION=' .env > .env.next || true
    echo "PROYECTA_VERSION=${prev}" >> .env.next
    mv .env.next .env
    docker compose pull apiserver dashboard player
    docker compose up -d
    docker compose restart proxy
  fi
  exit 1
fi

# Issue the TLS cert on first deploy and renew it when inside the
# expiry window. Non-fatal — a cert hiccup must not fail an
# otherwise-good app deploy.
if [ -x scripts/deploy/tls.sh ]; then
  scripts/deploy/tls.sh || echo "WARNING: TLS sync failed — check certs/proxy."
fi

# Reclaim disk: drop images from superseded releases.
docker image prune -af || true
docker builder prune -af || true

echo "Deployed ${VERSION} successfully."
docker compose ps

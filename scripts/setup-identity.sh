#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Generates local Fonoster Identity secrets: RSA signing keys and config/identity/identity.json
# (from identity.example.json with a random encryption key). Both are gitignored. Idempotent:
# existing keys/config are kept unless --force is passed.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$root/config/identity"
force="${1:-}"
mkdir -p "$dir/keys"

if [[ ! -f "$dir/keys/private.pem" || "$force" == "--force" ]]; then
  openssl genrsa -out "$dir/keys/private.pem" 2048 2>/dev/null
  openssl rsa -in "$dir/keys/private.pem" -pubout -out "$dir/keys/public.pem" 2>/dev/null
  # The container runs as a non-root user and must read the mounted keys.
  chmod 644 "$dir/keys/private.pem" "$dir/keys/public.pem"
  echo "generated Identity signing keys"
fi

if [[ ! -f "$dir/identity.json" || "$force" == "--force" ]]; then
  # prisma-field-encryption (cloak) key format: k1.aesgcm256.<base64url of 32 random bytes>
  key="k1.aesgcm256.$(openssl rand -base64 32 | tr '/+' '_-')"
  sed "s|__ENCRYPTION_KEY__|$key|" "$dir/identity.example.json" > "$dir/identity.json"
  echo "wrote config/identity/identity.json"
fi
# The API's own settings for the local stack (config/proyecta.example.json is the production
# template). Gitignored; kept if it already exists.
if [[ ! -f "$root/config/proyecta.json" ]]; then
  cat > "$root/config/proyecta.json" << 'JSON'
{
  "database": { "url": "postgresql://proyecta:proyecta@localhost:5433/proyecta" },
  "dashboard": { "url": "http://localhost:5175" },
  "identity": { "endpoint": "localhost:50052", "bridgeUrl": "http://localhost:9111" },
  "test": {
    "databaseUrl": "postgresql://proyecta:proyecta@localhost:5433/proyecta_test",
    "mailpitUrl": "http://localhost:8026"
  }
}
JSON
  echo "wrote config/proyecta.json"
fi
echo "Identity config ready"

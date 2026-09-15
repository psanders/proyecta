#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Dumps the Postgres container's "proyecta" and "identity" databases to
# timestamped, gzip-compressed files and prunes backups older than
# BACKUP_KEEP_DAYS. Unlike QCobro (which uses a DigitalOcean Managed
# Database with built-in backups), Proyecta's Postgres runs as a container on
# the droplet — this script is what stands in for that. Intended to run daily
# from cron/systemd on the droplet (see docs/deploy/README.md).
#
# Usage:
#   scripts/deploy/backup-db.sh [--out-dir <dir>] [--keep-days <n>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

OUT_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

while [ $# -gt 0 ]; do
  case "$1" in
    --out-dir)   OUT_DIR="$2";   shift 2 ;;
    --keep-days) KEEP_DAYS="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "$OUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

for db in proyecta identity; do
  file="$OUT_DIR/${db}-${stamp}.sql.gz"
  echo "backup-db: dumping $db -> $file"
  docker compose exec -T postgres pg_dump -U proyecta "$db" | gzip -9 > "$file"
done

echo "backup-db: pruning backups older than ${KEEP_DAYS} day(s) in $OUT_DIR"
find "$OUT_DIR" -name '*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

echo "backup-db: done."

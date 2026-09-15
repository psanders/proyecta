#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Idempotent TLS cert management for the Proyecta production stack. Adapted
# from QCobro's scripts/deploy/tls.sh for nginx (instead of Envoy) and for
# three SANs on one certificate (app/play/api) instead of one extra domain.
# Safe to run on every deploy and to fire by hand.
#
#   - First run (no cert yet): issues the certificate via certbot --standalone
#     and wires the renewal deploy-hook (refresh-proxy-certs.sh).
#   - Later runs: checks days-to-expiry and ONLY calls certbot when the cert is
#     inside the renewal window (default 30 days) — a fast no-op otherwise, so
#     it never burns Let's Encrypt rate limits.
#   - If the extra domains name hosts the existing cert doesn't cover yet, an
#     --expand issuance adds them as SANs. After that, normal renewals keep
#     the full SAN list automatically.
#
# The proxy container listens on 443 only (see config/nginx/proxy.conf.template),
# so port 80 is always free for certbot's standalone HTTP-01 challenge — no
# need to stop the stack for a renewal.
#
# Usage:
#   scripts/deploy/tls.sh [--domain <d>] [--extra-domains <d1,d2>] [--email <e>] [--days <n>] [--force]
#
# Config resolution (first wins): CLI flag -> environment -> .env in repo root.
#   TLS_EMAIL          ACME account / notices       (e.g. ops@proyecta.do)
#   TLS_DOMAIN         primary domain to certify    (default: APP_HOST)
#   TLS_EXTRA_DOMAINS  comma-separated extra SANs   (default: PLAY_HOST,API_HOST)
#   TLS_DAYS           renewal window in days       (default 30)
# The hosts already in .env for the proxy are the certificate's domains, so
# TLS_DOMAIN / TLS_EXTRA_DOMAINS are only needed to certify something else.
#
# Requires: root (or passwordless sudo), certbot, docker compose. Linux/GNU date.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

# Pull defaults from .env (same file that holds PROYECTA_VERSION) if present.
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

DOMAIN="${TLS_DOMAIN:-${APP_HOST:-}}"
EXTRA_DOMAINS="${TLS_EXTRA_DOMAINS:-$(printf '%s\n' "${PLAY_HOST:-}" "${API_HOST:-}" | sed '/^$/d' | paste -sd, -)}"
EMAIL="${TLS_EMAIL:-}"
RENEW_DAYS="${TLS_DAYS:-30}"
FORCE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)        DOMAIN="$2";        shift 2 ;;
    --extra-domains) EXTRA_DOMAINS="$2"; shift 2 ;;
    --email)         EMAIL="$2";         shift 2 ;;
    --days)          RENEW_DAYS="$2";    shift 2 ;;
    --force)         FORCE=1;            shift ;;
    -h|--help)
      sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[ -n "$DOMAIN" ] || { echo "tls.sh: no domain (set APP_HOST or TLS_DOMAIN in .env, or use --domain)" >&2; exit 1; }
[ -n "$EMAIL" ]  || { echo "tls.sh: TLS_EMAIL not set (use --email or .env)" >&2; exit 1; }

SUDO=""
[ "$(id -u)" -eq 0 ] || SUDO="sudo"

LIVE_DIR="/etc/letsencrypt/live/$DOMAIN"
HOOK="$REPO_DIR/scripts/deploy/refresh-proxy-certs.sh"
chmod +x "$HOOK" "$SCRIPT_DIR/tls.sh" 2>/dev/null || true

# Build the -d flags: primary domain + each comma-separated extra domain.
DOMAIN_FLAGS="-d $DOMAIN"
if [ -n "$EXTRA_DOMAINS" ]; then
  IFS=',' read -ra EXTRA_ARR <<< "$EXTRA_DOMAINS"
  for d in "${EXTRA_ARR[@]}"; do
    DOMAIN_FLAGS="$DOMAIN_FLAGS -d $d"
  done
fi

# ── First issuance ───────────────────────────────────────────────────────────
if [ ! -f "$LIVE_DIR/privkey.pem" ]; then
  echo "tls.sh: no certificate for $DOMAIN yet — issuing (standalone, port 80)…"
  # shellcheck disable=SC2086
  $SUDO certbot certonly --standalone $DOMAIN_FLAGS \
    --agree-tos -m "$EMAIL" --non-interactive \
    --deploy-hook "$HOOK"
  echo "tls.sh: issued and installed into the proxy."
  exit 0
fi

# ── SAN expansion (add missing extra domains to an existing cert, one-time) ──
if [ -n "$EXTRA_DOMAINS" ]; then
  MISSING=0
  for d in "${EXTRA_ARR[@]}"; do
    if ! $SUDO openssl x509 -noout -text -in "$LIVE_DIR/fullchain.pem" 2>/dev/null \
         | grep -q "DNS:$d"; then
      MISSING=1
    fi
  done
  if [ "$MISSING" -eq 1 ]; then
    echo "tls.sh: cert does not yet cover all of '$EXTRA_DOMAINS' — expanding (adds SANs)…"
    # --force-renewal is required: certbot --expand still checks the expiry
    # gate and refuses to re-issue when the cert is not near expiry, even
    # when new SANs are being added. One forced issuance per new domain set
    # is well within Let's Encrypt's rate limits.
    # shellcheck disable=SC2086
    $SUDO certbot certonly --standalone --expand --force-renewal $DOMAIN_FLAGS \
      --agree-tos -m "$EMAIL" --non-interactive \
      --deploy-hook "$HOOK"
    echo "tls.sh: expanded and installed into the proxy."
    exit 0
  fi
fi

# ── Renewal window check (rate-limit-safe) ───────────────────────────────────
END="$($SUDO openssl x509 -enddate -noout -in "$LIVE_DIR/fullchain.pem")"
END="${END#notAfter=}"
END_EPOCH="$(date -d "$END" +%s)"
NOW_EPOCH="$(date +%s)"
DAYS_LEFT=$(( (END_EPOCH - NOW_EPOCH) / 86400 ))
echo "tls.sh: $DOMAIN cert expires in ${DAYS_LEFT} day(s) (renewal window: ${RENEW_DAYS} days)."

if [ "$DAYS_LEFT" -gt "$RENEW_DAYS" ] && [ "$FORCE" -ne 1 ]; then
  echo "tls.sh: outside renewal window — nothing to do."
  exit 0
fi

# ── Renew ────────────────────────────────────────────────────────────────────
if [ "$FORCE" -eq 1 ]; then
  echo "tls.sh: --force given — forcing renewal (counts against Let's Encrypt rate limits)."
  $SUDO certbot renew --cert-name "$DOMAIN" --force-renewal --deploy-hook "$HOOK"
else
  echo "tls.sh: inside renewal window — running certbot renew…"
  $SUDO certbot renew --cert-name "$DOMAIN" --deploy-hook "$HOOK"
fi
echo "tls.sh: done."

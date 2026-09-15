# Proyecta — Production Deployment on DigitalOcean

Proyecta runs on its own Droplet, the same shape as QCobro's: a small nginx
reverse proxy terminates TLS on `:443` and routes to the apiserver, dashboard
and player containers on the internal Docker network. Postgres runs as a
container on the same Droplet (QCobro instead uses a DigitalOcean Managed
Database — see "Differences from QCobro" below).

The Droplet already exists: **name `proyecta`, IP `165.227.88.180`**, Docker
already installed, and SSH access is already set up the same way as QCobro's
droplet (same key/user), with credentials already stored as GitHub secrets in
this account. Nothing here creates or provisions a new Droplet.

---

## Architecture

| Service       | Role                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| **proxy**     | nginx, TLS termination + Host-based routing (`:443`)                           |
| **dashboard** | nginx serving the owner-dashboard SPA, proxies `/trpc`                         |
| **player**    | nginx serving the player SPA, proxies `/device`+`/media`                       |
| **apiserver** | Express + tRPC + `/device/v1`; runs `prisma migrate deploy` on boot            |
| **identity**  | Fonoster Identity — auth, authz, multi-tenancy                                 |
| **postgres**  | Postgres 17, one instance holding both the `proyecta` and `identity` databases |

Three hosts, one certificate (SANs on the same cert):

| Host               | Routes to   | Used by                                                                              |
| ------------------ | ----------- | ------------------------------------------------------------------------------------ |
| `app.proyecta.do`  | `dashboard` | Owner dashboard (browsers)                                                           |
| `play.proyecta.do` | `player`    | Paired screens (Chromium/Edge kiosks)                                                |
| `api.proyecta.do`  | `apiserver` | Shells that talk `/device/v1` directly (Android/kiosk), and the invite-accept bridge |

Hosts are configurable (`.env` on the Droplet — see below), so this table is
the default naming, not a hardcoded requirement.

---

## Differences from QCobro (and why)

- **Postgres is a container here**, not a DigitalOcean Managed Database.
  Simpler for v0; the tradeoff is that backups are now this repo's problem —
  see `scripts/deploy/backup-db.sh` and the cron setup below.
- **nginx terminates TLS instead of Envoy.** QCobro needs Envoy because
  Fonoster's Voice Server dials back over native gRPC/HTTP2 and tRPC
  subscriptions there ride WebSocket. Proyecta's device protocol and tRPC
  subscriptions both ride plain SSE over HTTP/1.1, so a plain nginx TLS
  terminator is enough — one less moving part.
- **The player ships as its own image and host** (`play.proyecta.do`)
  instead of being folded into the dashboard's static server, since paired
  screens are a distinct audience from the dashboard's owners.
- **Config reaches the Droplet by `rsync` over SSH, not by `curl`-ing
  `raw.githubusercontent.com`.** QCobro's repo is public; this one is
  private, so the deploy workflow's already-checked-out runner pushes the
  handful of non-secret files (compose file, nginx template, deploy scripts)
  straight to the Droplet instead of requiring a token there just to read
  repo content.
- Like QCobro: images are pinned by one `.env` variable
  (`PROYECTA_VERSION`), TLS is `certbot --standalone` (the proxy listens on
  443 only, so port 80 is always free), and the proxy reads certs from
  `config/certs/` (world-readable copies) rather than mounting
  `/etc/letsencrypt` directly, for the same userns-remap reason documented in
  QCobro's `docs/deploy.md`.

---

## Needs you

Everything below this line needs the product owner — credentials, DNS, and
GitHub settings this agent cannot and should not touch. Nothing past this
point has been done yet; the Droplet has not been modified.

### 1. Confirm/set GitHub repo secrets and variables

The deploy workflow (`.github/workflows/deploy.yml`) expects these. You said
the SSH credentials already exist in your GitHub account from QCobro's setup
— confirm the names match (rename or re-set if they don't), and add the ones
that are new to this repo:

```bash
# SSH connection to the Droplet (reuse QCobro's user/key — check what
# secrets.DEPLOY_SSH_USER / secrets.DEPLOY_SSH_KEY hold in the qcobro repo's
# settings, e.g. `gh secret list --repo <your-org>/qcobro`, and mirror them
# here under the same names):
gh secret set DEPLOY_SSH_HOST --repo psanders/proyecta --body "165.227.88.180"
gh secret set DEPLOY_SSH_USER --repo psanders/proyecta --body "<same user as qcobro>"
gh secret set DEPLOY_SSH_KEY  --repo psanders/proyecta < /path/to/the/same/private/key/qcobro/uses

# Where compose.yaml + .env live on the Droplet:
gh variable set DEPLOY_COMPOSE_DIR --repo psanders/proyecta --body "/opt/proyecta"

# A PAT with `read:packages` so the Droplet can pull from GHCR (can be the
# same one QCobro's RELEASE_TOKEN secret already holds, if it has access to
# this repo's packages too — otherwise mint a new one at
# https://github.com/settings/tokens):
gh secret set RELEASE_TOKEN --repo psanders/proyecta --body "<PAT with read:packages>"
```

Then, in **Settings → Environments**, create (or confirm) a `production`
environment with a required reviewer, so `deploy.yml` pauses for approval
before it ever touches the Droplet.

### 2. DNS

Point three A-records at `165.227.88.180`:

| Type | Host               | Value            |
| ---- | ------------------ | ---------------- |
| A    | `app.proyecta.do`  | `165.227.88.180` |
| A    | `play.proyecta.do` | `165.227.88.180` |
| A    | `api.proyecta.do`  | `165.227.88.180` |

Confirm before issuing a cert:

```bash
dig +short app.proyecta.do A play.proyecta.do A api.proyecta.do A
```

### 3. SMTP for production email (invites, password resets)

Local dev uses Mailpit; production needs a real provider. QCobro uses Resend
— reuse the same account/domain setup if you have one, or pick another SMTP
provider. You'll need: SMTP host/port, a sender address on a domain you
control, and credentials. These go into `config/identity/identity.json` on
the Droplet (step 4 below) — never in the repo.

### 4. One-time Droplet setup

Docker is already installed. Run this once, from **your own machine** (it
has this repo checked out and your own GitHub credentials — no git needed on
the Droplet), replacing the placeholders and filling every `CHANGE_ME` /
`REPLACE_*` value it asks for:

```bash
DEPLOY_USER=<same user as qcobro>   # from step 1
DEPLOY_HOST=165.227.88.180

# 1. Create the compose directory on the Droplet.
ssh "$DEPLOY_USER@$DEPLOY_HOST" 'sudo mkdir -p /opt/proyecta && sudo chown "$USER":"$USER" /opt/proyecta'

# 2. Copy the non-secret files the stack needs (the same ones the Deploy
#    workflow will keep in sync on every future release).
rsync -avz --relative \
  compose.yaml \
  config/nginx/proxy.conf.template \
  docker/postgres-init.prod.sql \
  scripts/deploy/tls.sh \
  scripts/deploy/refresh-proxy-certs.sh \
  scripts/deploy/backup-db.sh \
  "$DEPLOY_USER@$DEPLOY_HOST:/opt/proyecta/"
ssh "$DEPLOY_USER@$DEPLOY_HOST" 'chmod +x /opt/proyecta/scripts/deploy/*.sh'

# 3. SSH in for everything else — secrets that must be generated ON the
#    Droplet and never leave it.
ssh "$DEPLOY_USER@$DEPLOY_HOST"
```

Now, **on the Droplet**:

```bash
cd /opt/proyecta

# 3a. Identity's RSA signing keys + config, generated here (never in git —
#     see scripts/setup-identity.sh, which does the same thing for local dev).
mkdir -p config/identity/keys config/identity/templates config/certs backups
openssl genrsa -out config/identity/keys/private.pem 2048
openssl rsa -in config/identity/keys/private.pem -pubout -out config/identity/keys/public.pem
chmod 644 config/identity/keys/private.pem config/identity/keys/public.pem

# The encryptionKey is a Cloak key (same format prisma-field-encryption
# uses). Generate one with Node — any machine works, it doesn't touch the DB:
npx --yes @47ng/cloak generate
```

Fetch the templates and the production config example from your own machine
(they're not secret) — from **your machine**, in a second terminal:

```bash
rsync -avz --relative \
  config/identity/templates/inviteNewUser.hbs \
  config/identity/templates/inviteExistingUser.hbs \
  config/identity/templates/resetPassword.hbs \
  config/identity/templates/verifyEmail.hbs \
  config/identity/templates/verifyPhone.hbs \
  config/identity/identity.production.example.json \
  config/proyecta.example.json \
  "$DEPLOY_USER@$DEPLOY_HOST:/opt/proyecta/"
```

Back **on the Droplet**:

```bash
cd /opt/proyecta
cp config/identity/identity.production.example.json config/identity/identity.json
```

Edit `config/identity/identity.json` and fill in:

- `database.url` — `postgresql://proyecta:<the POSTGRES_PASSWORD you'll set below>@postgres:5432/identity?schema=public`
- `encryptionKey` — the Cloak key from step 3a
- `appUrl` / `invite.url` / `invite.failUrl` — already point at
  `app.proyecta.do`; change only if you chose different hosts
- `smtp` — your production SMTP provider's host/port/sender/credentials (see
  "Needs you" step 3)

Then the apiserver's own settings:

```bash
cp config/proyecta.example.json config/proyecta.json
chmod 644 config/proyecta.json   # the container runs as a non-root user
```

Edit `config/proyecta.json`:

- `database.url` — replace `CHANGE_ME` with the same `POSTGRES_PASSWORD`
  (URL-encode it if it has `/`, `+` or `=`)
- `dashboard.url` — the public dashboard URL, used in password-reset links
- only if you changed `issuer` / `audience` in `identity.json`: add the same
  values as `identity.issuer` / `identity.audience` (both default to
  `proyecta`, Identity's own default)
- optional `media.dir` — only if the demo media lives somewhere other than
  the image default (`/app/packages/api/.data/media`, where compose mounts it)

```bash
# 3b. Pin the release, hosts and TLS settings for compose and the deploy scripts.
cat > .env << 'ENV'
PROYECTA_VERSION=v0.1.0
APP_HOST=app.proyecta.do
PLAY_HOST=play.proyecta.do
API_HOST=api.proyecta.do
POSTGRES_PASSWORD=CHANGE_ME
TLS_DOMAIN=app.proyecta.do
TLS_EXTRA_DOMAINS=play.proyecta.do,api.proyecta.do
TLS_EMAIL=team@proyecta.do
ENV
# Generate a real password and put it in .env (POSTGRES_PASSWORD),
# config/identity/identity.json and config/proyecta.json (both database.url) —
# all three must match.
openssl rand -base64 24

# 3c. Issue the TLS certificate. The proxy container listens on 443 only, so
#     port 80 is free for certbot's standalone challenge — no need to stop
#     anything first.
sudo apt update && sudo apt install -y certbot
scripts/deploy/tls.sh

# 3d. Authenticate to GHCR, pull the pinned images, and launch. Migrations
#     run automatically (the apiserver entrypoint runs `prisma migrate
#     deploy` before starting).
echo "$CR_PAT" | docker login ghcr.io -u <your-github-username> --password-stdin
docker compose pull
docker compose up -d
```

> **Keys & secrets are never in the repo.** `config/identity/identity.json`
> and `config/identity/keys/` contain a private key and SMTP credentials, so
> they're git-ignored and generated only on the Droplet (steps 3a–3b). Only
> the `*.production.example.json` files (placeholders) live in GitHub.
> `config/proyecta.json` (database URL) and `.env` (the Postgres password,
> hosts, TLS settings) are also git-ignored and Droplet-only.

**Verify:**

```bash
docker compose ps          # every service Up (healthy)
curl -I https://app.proyecta.do/                # dashboard, 200
curl https://api.proyecta.do/healthz            # {"ok":true}
curl -I https://play.proyecta.do/               # player, 200
```

### 5. First deploy vs. later deploys

The steps above (3a–3d) are the **first** deploy, done by hand because they
also bootstrap secrets that must never touch CI. After that, releases come
from Conventional Commits (`release.yml`, release-please):

1. Every push to `main` updates one **`chore(release): X.Y.Z`** PR with the
   version bump (`feat` → minor, `fix` → patch while below 1.0) and the
   `CHANGELOG.md` entry. `docs`, `chore`, `ci`, `test` and `build` commits
   alone don't cut a release.
2. Before merging it, do every step listed in
   [`PENDING.md`](./PENDING.md) on the droplet, then empty that file in the
   release PR.
3. Merging it tags `vX.Y.Z`, creates the GitHub release, runs
   `docker-publish.yml` (builds and pushes the three images to GHCR) and then
   `deploy.yml` (pauses for the `production` environment's approval, rsyncs
   the version-pinned `compose.yaml` / nginx template / deploy scripts, pins
   `PROYECTA_VERSION`, pulls, and restarts — rolling back automatically if a
   container doesn't come up healthy).

One-time repo setting: Settings → Actions → General → **Allow GitHub Actions
to create and approve pull requests** (release-please opens the release PR
with `GITHUB_TOKEN`).

Pushing a tag by hand (`git tag v0.2.0 && git push origin v0.2.0`) still
publishes and deploys, but skips the changelog and version bump; prefer the
release PR.

To redeploy or roll back manually:

```bash
gh workflow run deploy.yml -f version=v0.1.0 --repo psanders/proyecta
```

---

## Certificate renewal

Automatic, on two independent paths (you don't need to do anything after
first issuance):

1. certbot's systemd timer runs `certbot renew` twice daily; the deploy-hook
   registered in step 3c (`scripts/deploy/refresh-proxy-certs.sh`) copies a
   renewed cert into `config/certs/` and restarts the `proxy` container, but
   only on an actual renewal.
2. Every Deploy workflow run also calls `scripts/deploy/tls.sh`, which is a
   fast no-op outside the renewal window and never burns Let's Encrypt rate
   limits.

Verify the renewal path without issuing a real cert:

```bash
sudo certbot renew --dry-run
```

## Demo media (optional)

The default rotation (`scripts/generate-demo-ads.sh`) needs ffmpeg with
`libvpx-vp9`/`libx264`/`libwebp` and macOS's system Arial fonts, so it's
meant to run on a developer's Mac, not inside the Linux container image —
that's why the apiserver image ships with an **empty** `media-data` volume
and the app runs fine without it (no default rotation until real advertisers
exist). To seed it:

```bash
# On your Mac:
scripts/generate-demo-ads.sh

# Copy the output into the Droplet's volume:
docker compose cp packages/api/.data/media/. apiserver:/app/packages/api/.data/media/
```

## Backups

Postgres runs as a container, so — unlike QCobro's managed database — backups
are this repo's job. `scripts/deploy/backup-db.sh` dumps both the `proyecta`
and `identity` databases (gzip, timestamped) and prunes anything older than
`BACKUP_KEEP_DAYS` (default 14). Run it daily via cron on the Droplet:

```bash
( crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/proyecta && ./scripts/deploy/backup-db.sh >> /var/log/proyecta-backup.log 2>&1" ) | crontab -
```

Restore from a backup:

```bash
gunzip -c backups/proyecta-20260101T030000Z.sql.gz | docker compose exec -T postgres psql -U proyecta proyecta
```

## Updating

```bash
cd /opt/proyecta
sed -i "s/^PROYECTA_VERSION=.*/PROYECTA_VERSION=v0.2.0/" .env   # the new release
docker compose pull
docker compose up -d
```

The CI Deploy workflow does this for you on every tag push (see "First
deploy vs. later deploys" above).

## Rollback

```bash
cd /opt/proyecta
sed -i "s/^PROYECTA_VERSION=.*/PROYECTA_VERSION=<previous-good-tag>/" .env
docker compose pull
docker compose up -d
```

`deploy.yml` does this automatically if the new version's containers don't
come up healthy within 60 seconds of a CI-triggered deploy.

---

## Secrets checklist

| Secret                                                   | Where                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `config/identity/identity.json`                          | `/opt/proyecta/config/identity/identity.json` on the Droplet (DB URL, encryption key, SMTP) |
| `config/identity/keys/private.pem`                       | `/opt/proyecta/config/identity/keys/` on the Droplet                                        |
| `config/proyecta.json`                                   | `/opt/proyecta/config/proyecta.json` on the Droplet (apiserver database URL, Identity)      |
| `.env` (`POSTGRES_PASSWORD`, hosts, TLS)                 | `/opt/proyecta/.env` on the Droplet                                                         |
| `DEPLOY_SSH_KEY` / `DEPLOY_SSH_USER` / `DEPLOY_SSH_HOST` | GitHub repo secrets (reused from QCobro's setup)                                            |
| `RELEASE_TOKEN` (GHCR pull, CI)                          | GitHub repo secret                                                                          |

---

## Troubleshooting

| Symptom                                                             | Check                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `curl: (35) SSL handshake failed`                                   | Are `config/certs/{fullchain,privkey}.pem` present and non-empty? Re-run `scripts/deploy/tls.sh`.                                                                                                                                 |
| SSE (`/device/v1/events`, tRPC subscriptions) never delivers events | Confirm `proxy_buffering off` survived in `config/nginx/proxy.conf.template` and the dashboard/player nginx configs — any hop that buffers breaks the stream.                                                                     |
| Apiserver restarts in a loop                                        | Migrations failing — `docker compose logs apiserver` and verify `POSTGRES_PASSWORD` matches `database.url` in `proyecta.json` and `identity.json`. "Config file not found" means `config/proyecta.json` is missing or unreadable. |
| Proxy exits immediately                                             | `docker compose logs proxy` — usually a missing cert file or an nginx template syntax error.                                                                                                                                      |
| Invite/reset emails never arrive                                    | Check `smtp` in `identity.json` and the provider's dashboard for bounces/blocks.                                                                                                                                                  |

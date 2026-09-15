# syntax=docker/dockerfile:1.4
# ─────────────────────────────────────────────────────────────────────────────
# Proyecta — multi-stage Dockerfile
#
# Targets
#   apiserver   Express + tRPC + /device/v1 (HTTP + SSE) + Prisma on Postgres  (port 3000)
#   dashboard   Nginx serving the compiled owner-dashboard SPA, proxying /trpc  (port 80)
#   player      Nginx serving the compiled player SPA, proxying /device + /media (port 80)
#
# Structure mirrors the QCobro Dockerfile: one file, one shared dependency
# install, per-package build stages, small non-root-friendly runtime images.
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22

# ── base ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
# openssl: required by Prisma's query/schema engines on musl (alpine) libc.
RUN apk add --no-cache openssl
WORKDIR /app

# ── deps ─────────────────────────────────────────────────────────────────────
# npm workspaces require every workspace listed in the root package.json to
# have a package.json on disk, so all five are copied even though only
# common/api/dashboard/player are built into images (packages/web ships via
# its own CI, see .github/workflows/web.yml).
FROM base AS deps

COPY package.json package-lock.json lerna.json ./
COPY packages/common/package.json    packages/common/
COPY packages/api/package.json       packages/api/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/player/package.json    packages/player/
COPY packages/web/package.json       packages/web/

RUN npm ci --ignore-scripts

# ── build-common ─────────────────────────────────────────────────────────────
FROM deps AS build-common
COPY tsconfig.base.json ./
COPY packages/common packages/common
RUN npx tsc -b packages/common

# ── build-api ────────────────────────────────────────────────────────────────
FROM build-common AS build-api
COPY packages/api packages/api
# Generates src/generated/prisma (gitignored) before compiling — the Prisma
# client is plain TS source included by packages/api's tsconfig, not a
# separate copy step. DATABASE_URL is a placeholder: prisma.config.ts requires
# it to resolve, but `prisma generate` never connects to a database.
ENV DATABASE_URL="postgresql://proyecta:proyecta@localhost:5432/proyecta"
RUN npm run db:generate --workspace=@proyecta/api
RUN npx tsc -b packages/api

# ── build-dashboard ──────────────────────────────────────────────────────────
# Based on build-api (not build-common): the dashboard type-checks against the
# tRPC AppRouter type imported from apiserver's *source* (the "source" export
# condition), which transitively reaches the generated Prisma client — both
# only exist once build-api has run.
FROM build-api AS build-dashboard
COPY packages/dashboard packages/dashboard
RUN npm run build --workspace=@proyecta/dashboard

# ── build-player ─────────────────────────────────────────────────────────────
# Based on build-common: the player only depends on @proyecta/common (also via
# the "source" condition), never on the api package.
FROM build-common AS build-player
COPY packages/player packages/player
RUN npm run build --workspace=@proyecta/player

# ═══════════════════════════════════════════════════════════════════════════════
# apiserver — production runtime
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS apiserver
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Node modules from build-api so they include the generated Prisma client
# (compiled into dist — see below) plus the prisma CLI needed by the
# entrypoint's `migrate deploy`. npm hoists workspace deps to the root
# node_modules, so there is no per-workspace node_modules to copy.
COPY --from=build-api /app/node_modules ./node_modules

# Built artifacts. package.json alongside dist is needed so the workspace
# symlink node_modules/@proyecta/common -> packages/common resolves.
COPY --from=build-api /app/packages/common/package.json ./packages/common/package.json
COPY --from=build-api /app/packages/common/dist         ./packages/common/dist
COPY --from=build-api /app/packages/api/package.json    ./packages/api/package.json
COPY --from=build-api /app/packages/api/dist            ./packages/api/dist

# Prisma schema + migrations + config (needed for `prisma migrate deploy`).
# prisma.config.ts is where the datasource URL is resolved from DATABASE_URL
# (schema.prisma itself has no `url =`, per Prisma 7's config-based setup) —
# without it, migrate deploy has no database to connect to.
COPY packages/api/prisma            ./packages/api/prisma
COPY packages/api/prisma.config.ts  ./packages/api/prisma.config.ts

# Demo media directory: empty by default in the image. Mount a volume here (see
# compose.prod.yaml) and populate it with scripts/generate-demo-ads.sh output
# to serve a default rotation before real advertisers exist — see docs/deploy.
RUN mkdir -p ./packages/api/.data/media

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Runs as the image's built-in unprivileged "node" user (present on the
# official Node image) rather than root.
RUN chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]

# ═══════════════════════════════════════════════════════════════════════════════
# dashboard — nginx serving the owner-dashboard SPA
# ═══════════════════════════════════════════════════════════════════════════════
FROM nginx:alpine AS dashboard
COPY config/nginx/dashboard.conf /etc/nginx/conf.d/default.conf
COPY --from=build-dashboard /app/packages/dashboard/dist /usr/share/nginx/html
EXPOSE 80

# ═══════════════════════════════════════════════════════════════════════════════
# player — nginx serving the player SPA
# ═══════════════════════════════════════════════════════════════════════════════
FROM nginx:alpine AS player
COPY config/nginx/player.conf /etc/nginx/conf.d/default.conf
COPY --from=build-player /app/packages/player/dist /usr/share/nginx/html
EXPOSE 80

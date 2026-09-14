# Proyecta

Digital-out-of-home marketplace for the Dominican Republic. This repo holds the player, the device API and the owner dashboard. Agent and contributor guide: `CLAUDE.md`.

## Requirements

- Node 22 (`nvm use`)
- Docker (local Postgres)
- ffmpeg (asset renditions)

## Setup

```bash
npm install
cp .env.example packages/api/.env
npm run db:up            # Postgres 17 on localhost:5433
npm run db:migrate
npx playwright install chromium   # once, for e2e
```

## Develop

```bash
npm run dev:api          # http://localhost:3000  (/trpc, /device/v1)
npm run dev:dashboard    # http://localhost:5173
npm run dev:player       # http://localhost:5174
```

## Check

```bash
npm run lint && npm run typecheck && npm test
npm run test:integration   # Postgres
npm run test:e2e           # Playwright (Chromium)
```

## Specs

Product behavior is specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`@fission-ai/openspec`) under `openspec/`. Changes are driven to done with `/ps:ship <change>`.

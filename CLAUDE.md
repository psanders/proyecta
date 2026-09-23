# Proyecta — Agent Guide

Proyecta is a digital-out-of-home marketplace for the Dominican Republic. Screen owners ("valleros") connect their screens; advertisers get their spots played. v0 is about the **player**, which turns any screen into a network screen.

## How work is organized

- **Coding conventions (the HOW)** live in this file. They apply to every change.
- **Product behavior (the WHAT)** lives in OpenSpec specs under `openspec/specs/`, changed through proposals in `openspec/changes/`. Use `/opsx:propose`, `/opsx:apply`, `/opsx:archive`. Specs describe observable, testable behavior, not coding style.
- **Shipping a change (the LOOP)** drives one change from design to archive with `/ps:ship <change>`: design → spec reconcile → build → tests → sync → archive, resumable via a per-change checkpoint.
- **v0 changes, in order:** `device-protocol` → `player-core` → `owner-dashboard` → `player-shells`.

## Repository layout

- `packages/common`: shared Zod schemas, types, errors, utils (pairing codes, validation spine). The single source of truth for contracts, including the device protocol. Depends on no other workspace package.
- `packages/api`: Express server with Prisma on Postgres.
  - `/trpc`: the dashboard API.
  - `/device/v1`: the device protocol (HTTP + SSE).
  - Business logic lives in `src/api/<domain>/create<Name>.ts`.
- `packages/dashboard`: minimal owner dashboard (Vite + React + Tailwind + tRPC client). Functional only, **no design pass**.
- `packages/player`: the player core (Vite + **vanilla TS, no UI framework**). Must follow Pencil branding exactly.
- `packages/web`: marketing site for proyecta.do (Vite + React + Tailwind, no router). Two pages: home (`web-home` / `web-home-mobile` Pencil frames) and `/download/` (`web-download` / `web-download-mobile`), which reads the latest installers from the downloads store's `latest.json`. Copy in `src/strings.ts`.
- Downloads store: `api.proyecta.do/downloads/` (nginx, the droplet's `downloads/` folder), one `v<version>/` folder per release plus `latest.json`, written by `.github/workflows/shells.yml` via `scripts/downloads/manifest.mjs`.
- `shells/android`: Kotlin WebView app (Gradle, outside npm workspaces). Bundles the player's `dist/` in the APK and exposes `window.ProyectaShell`.
- `shells/kiosk`: Linux (Chromium + cage) and Windows (Edge) kiosks. Two processes: the browser runs the player; `helper/` (Go) is a separate loopback-only service that serves the player from disk, answers `/shell/info` and `/shell/metrics`, and proxies the device API. One installer per platform (`.deb`, Windows `.exe`; the APK for Android), attached to each release by `.github/workflows/shells.yml`.
- `scripts/transcode.sh`: ffmpeg renditions (VP9 WebM + H.264 MP4 + WebP).
- `design/pencil.pen`: design source. **Access only through the Pencil MCP, never Read/Grep it.** Player frames: `player-pairing`, `player-now-playing`, `player-unsupported`.
- `cleanup/`: temporary old research and website docs, gitignored, contains confidential material. Read for context only; never commit, never copy its text into the product.

## Project rules

- **Device ≠ Screen.**
  - A Device is physical hardware; a Screen is the virtual listing.
  - They link through `DeviceBinding` rows with `linkedAt`/`unlinkedAt`, so play history stays attributable after a device moves.
- **Pairing codes are permanent:**
  - 8 characters, displayed `XXXX-XXXX`, from the alphabet in `packages/common/src/utils/pairingCode.ts`.
  - Minted only by the server and keyed to a hardware id. Never generate codes on the device.
  - Stored canonically without the dash.
- **`/device/v1` is a frozen contract.** Devices in the field update on their own schedule. Only additive, backward-compatible changes; breaking changes need `/device/v2`. The dashboard uses tRPC; devices never do.
- **Accounts come from Fonoster Identity** (users, workspaces = businesses, roles, invites, tokens). Proyecta never stores passwords. Resources are owned by the workspace `accessKeyId` (`WO…`). tRPC guards: `protectedProcedure` → `workspaceProcedure` (`x-workspace` header) → `adminProcedure` / `ownerProcedure`. Parse router inputs with `validate(schema)` so errors carry localized field errors; schema and `DomainError` messages are `apiMessages` ids, never literal text.
- **Playback never depends on the network.** Sync modes: realtime (SSE), polling, offline.
- **Engines:** Chromium, not Chrome; Edge on Windows. Player floor: Chromium 69, a working value until the device spike measures real boxes. It lives in `MIN_CHROMIUM` (`packages/player/vite.config.ts`, legacy build) and `MIN_WEBVIEW_MAJOR` (Android shell), which must match.
- **Health figures mean exactly what they say.** RAM, disk and CPU load come only from a native shell; a plain browser can't read them and the dashboard says so. Never report a proxy (e.g. the page's JS heap) under a hardware figure's name. See the `device-sync` spec.
- **Player branding:**
  - Tokens live in `packages/player/src/theme.css` and come from Pencil. Never invent colors.
  - Fonts: JetBrains Mono + Geist, self-hosted so they render offline.
  - Designed at 1600×900; sizes use the `--px` unit so any resolution scales.
- **Internals are English:** code, identifiers, enum values, database columns, JSON keys, catalog ids, URL paths and query params are always English. Only user-facing copy is localized.
- **Language:** user-facing text is Spanish (es-DO) by default. The owner dashboard also supports English: copy lives in `packages/dashboard/src/lib/messages/{es,en}.ts` (flat ids, read with `useI18n().t`), and API messages it shows are ids from `apiMessages` in `@proyecta/common`, resolved by the `x-language` header. The player and web stay Spanish, in their strings modules. No i18n library.

## Coding conventions

### Validated functions (preferred pattern for service/data functions)

Business logic uses the **validated-function** pattern:

- A factory injects dependencies and wraps an inner `fn` with `withErrorHandlingAndValidation(fn, schema)`.
- Invalid input throws a structured `ValidationError` before the operation runs.
- Tests inject stubs, with no live services.
- Schemas and narrow client interfaces (e.g. `DeviceDbClient`) live in `@proyecta/common`.

Apply it to input-validating operations, not trivial pure helpers or framework glue. Worked example: `packages/api/src/api/devices/createRegisterDevice.ts`.

Full guide, rationale, and scaffolding: `/ps:create-validated-function` (source: github.com/psanders/psstack).

### General

- TypeScript strict; no `any` (ESLint enforces `@typescript-eslint/no-explicit-any`).
- ESM: relative imports carry the `.js` extension, even from `.ts` source.
- Share contracts via `@proyecta/common`; don't duplicate types across packages. Workspace packages expose a `source` export condition, so tests, dev servers and Vite run from TypeScript source.
- Copyright header on every source file: `Copyright (C) 2026 by Proyecta. All rights reserved.`
- **Tests:**
  - Unit tests: mocha + chai + sinon, one file per function, always including a validation-failure case.
  - Postgres integration tests: `packages/api/test/integration`.
  - E2E: Playwright in `e2e/`.

### Commands

- `npm run db:up`: writes a local `config/proyecta.json` if missing (the API's settings, no `.env`; `config/proyecta.example.json` is the production template), generates Identity secrets (`scripts/setup-identity.sh`) and starts Postgres 17 on **5433** (`proyecta`, `proyecta_test`, `identity` databases), Fonoster Identity (gRPC **50052**, invite bridge **9111**) and Mailpit (SMTP 1026, UI **8026**).
- `npm run db:migrate` / `db:generate` / `db:studio`
- `npm run lint && npm run typecheck && npm test`: the green gate before any spec sync.
- `npm run test:integration`: needs `db:up`.
- `npm run test:e2e`: needs `npx playwright install chromium` once.
- `npm run dev:api` / `dev:dashboard` (5175) / `dev:player` (5174) / `dev:web` (5176)

## Commits

Use **Conventional Commits** (`type(scope): subject`, e.g. `feat(api): add device register endpoint`). A Husky `commit-msg` hook runs commitlint and rejects non-conforming messages.

The type decides the release: release-please (`.github/workflows/release.yml`) turns `feat`/`fix`/`perf`/`refactor` commits on `main` into a `chore(release)` PR; merging it tags, publishes and deploys. Never bump versions or push tags by hand. **If a change needs a manual step on the production droplet** (e.g. editing `config/identity/identity.json`, a new file to mount), add it to `docs/deploy/PENDING.md` in the same PR.

## Context

See proposal.md for the why. Today every linked screen plays one global rotation (`buildDeviceState` →
`createRotationLoader(mediaDir)`, the generated demo ads served at `/media`). `PlayLog` rows carry `itemId`, the
screen (by link history) and the pay-per-display snapshot (`billedUnits`, `rateCentsAtPlay`). Businesses are
Identity workspaces; Proyecta-owned per-business data lives in `WorkspaceSettings`. The dashboard uses tRPC with
`workspaceProcedure` / `adminProcedure` guards and `validate(schema)`; there is no file upload anywhere yet. The API
runs as a single instance with an in-process `EventHub`. The research behind the product decisions (approval model,
view setting, house plays) is in `openspec/research/advertiser-ads-and-workspace-view.md`.

## Goals / Non-Goals

**Goals:** a data model that `ad-review` can build on without migrating placements again; nothing pending ever
reaches a device; billing facts attributed at record time like the existing rate snapshot; no new heavy services
(queues, object storage) for v0.

**Non-Goals:** horizontal scaling of uploads/transcoding, CDN/object storage, resumable uploads, per-orientation
variants of an ad, advertiser invoicing (see proposal Non-goals).

## Decisions

### Data model

- `WorkspaceSettings.dashboardView` enum `SCREEN_OWNER | ADVERTISER | BOTH`, default `SCREEN_OWNER`. A missing
  settings row reads as the default, same as `timezone` today.
- `Asset`: `workspaceAccessKeyId`, `name`, `kind` (`IMAGE | VIDEO`), `status` (`PROCESSING | READY | FAILED`),
  `durationMs`, `width`, `height`, `orientation` (reuses the `Orientation` enum), `sourceFile`, `sizeBytes`, `sha256`,
  `renditions` (JSON: `webp` | `webm` + `mp4`, plus `poster`), `failureReason`, timestamps. Immutable after
  `READY`/`FAILED` except deletion (hard delete of row and files, only when no placement references it).
- `Ad`: `workspaceAccessKeyId`, `name`, `advertiserName` (business name snapshotted at creation — other businesses'
  names can't be read from Identity with the viewer's token, and the manifest needs it), `assetId` (current file),
  `startDate`/`endDate` (`YYYY-MM-DD` as entered), `startsAt`/`endsAt` (instants: start of start date and start of
  the day after the end date, in the business's time zone at creation), `state` (`SUBMITTED | CANCELED`),
  `canceledAt`, timestamps. `SUBMITTED` leaves room for `DRAFT` later without renaming.
- `AdPlacement`: `adId`, `screenId`, `assetId`, `status` (`PENDING | APPROVED | REJECTED | REVOKED | WITHDRAWN`),
  `decidedAt`, `withdrawnAt`, `createdAt`. The full status set ships now so `ad-review` only adds transitions.
  Rows are history: replacing a file inserts rows, removing a screen sets `WITHDRAWN`. Cancelling only sets
  `Ad.state = CANCELED` (rotations require `SUBMITTED`), so a cancelled ad still lists the screens it had.
- **Effective placement** for an (ad, screen): the most recently created `APPROVED` row among rows that aren't
  `WITHDRAWN`. That single rule gives "old approved file keeps playing until the new one is approved" and "own screens
  swap at once" (the new own row is inserted `APPROVED`). Alternative considered: a `supersededAt` column updated on
  approval — rejected, it's derived state that can drift.
- `PlayLog` gains `placementId` (nullable FK), `advertiserWorkspaceAccessKeyId` (nullable) and `house` (bool, default
  false). Like the rate, attribution is a snapshot at record time.

### Upload transport

- `POST /uploads/assets` on the Express app, not tRPC: tRPC has no streaming upload story and the files reach 200 MB.
  The body is the raw file (`Content-Type` = the file's MIME type), with `name`, `fileName` and (images)
  `durationMs` as query parameters. Auth reuses `resolveContext` (bearer token + `x-workspace` + `x-language`) and the
  same admin rule and error localization as tRPC, returning `{ asset }` or the tRPC-shaped error JSON the dashboard's
  `errorMessage`/`fieldErrors` already understand. Alternatives: multipart via multer/busboy (a new dependency for a
  single field) or presigned object storage (no object storage in v0).
- The request streams to a temp file with a byte counter that aborts past the limit for the declared type, so memory
  stays flat. The declared type only chooses the limit and which checks apply; `ffprobe` decides what the file really
  is.

### Checks and renditions

- `createUploadAsset` (validated function) takes injected `probe` (ffprobe JSON → kind, duration, width, height) and
  `storage` ports, applies the spec's checks, moves the source to `CONTENT_DIR/<assetId>/source.<ext>`, inserts the
  asset as `PROCESSING` and enqueues it. Video duration: `round(seconds / 5) * 5000` accepted when within 500 ms and in
  5–60 s.
- A single in-process `RenditionQueue` (concurrency 1) runs ffmpeg with the same settings as `scripts/transcode.sh`
  (VP9 CRF 32 + H.264 CRF 21, no audio, 30 fps; WebP q90) but scaled to the asset's own size capped at 1920 on the
  long side with even dimensions and no padding (the player already letterboxes), plus a WebP poster. On success
  `READY` with rendition paths under `/content/<assetId>/…`; on failure `FAILED`. On API start, `PROCESSING` assets
  are re-enqueued. The TS port (not the shell script) because the production image doesn't ship `scripts/`, and tests
  stub the ffmpeg runner.
- `CONTENT_DIR` (default `packages/api/.data/content`) is served at `/content` by `express.static` (Range support for
  video), separate from `MEDIA_DIR` because `generate-demo-ads.sh` wipes the media dir.

### Rotation per screen

- `buildDeviceState` asks a `loadScreenRotation(screenId, now)` port: effective placements of non-cancelled ads with
  `startsAt <= now < endsAt` and a `READY` asset, ordered by ad creation. Items: `id` = placement id (so play logs
  attribute directly), `advertiser` = `Ad.advertiserName`, `title` = `Ad.name`, `durationMs` and renditions from the
  asset. `version` = hash of the ordered item ids; `width`/`height` from the screen's resolution (default 1920×1080).
  No items → the default rotation, unchanged. Same `deviceStateSchema`, so `/device/v1` is untouched.
- `notifyScreens(screenIds)`: after any ad mutation, publish `rotation.updated` with a fresh state to devices currently
  linked to those screens. A `createAdScheduleSweeper` (every 60 s, like the status sweeper) finds ads whose
  `startsAt` or `endsAt` fell in `(lastSweep, now]` and notifies their screens. Polling players pick changes up on
  their next poll anyway.

### Billing attribution

- `createRecordPlayLogs` loads the placements whose ids appear as `itemId` in the batch (with ad workspace and asset
  duration). For those plays: `placementId`, `advertiserWorkspaceAccessKeyId` set; `house = advertiser ==
  screen.workspaceAccessKeyId` (screen by link history at `startedAt`); house plays get `billedUnits = null` and
  `rateCentsAtPlay = null`; a missing device duration falls back to the asset duration instead of the default rotation.
  Non-ad items keep today's behavior.
- Screen earnings add `housePlays` per window (completed, `house = true`). Ad stats aggregate completed plays by
  `placementId` over the ad's placements: plays, house plays, spend = Σ `centsForPlay`.

### Dashboard

- `workspaces.settings` returns `dashboardView`; `workspaces.setDashboardView` (admin) changes only the view;
  `workspaces.create` accepts an optional view; `workspaces.activity` returns `{ linkedScreens, activeAds }` for the
  switch confirmation. The sidebar reads the view from the cached settings query.
- New English routes (`/assets`, `/ads`, `/ads/new`, `/ads/:id`, `/explore`) alongside the existing Spanish ones,
  which a separate change renames. The index route redirects advertiser businesses to `/ads`.
- Uploads use `fetch` with the session's auth headers (not the tRPC client) and refresh the asset list while any asset
  is `PROCESSING`.
- Sign-up lands on a new `/welcome` step (the view choice) before the existing pairing onboarding,
  which stays reachable on its own from Pantallas.
- Pencil frames (section "5 · Advertiser & dashboard view"): `advertiser-explore`,
  `advertiser-assets-v2`, `advertiser-ads-v2`, `advertiser-ad-new-screens`, `advertiser-ad-new-review`,
  `advertiser-ad-detail`, `onboarding-view-choice`, `workspace-settings-view`,
  `workspace-settings-view-dialog` and `dashboard-nav-views`. The Colombia-era frames are renamed
  `legacy: advertiser-*`.

## Risks / Trade-offs

- [Transcoding in the API process competes with request handling] → concurrency 1, `nice` priority where available;
  moving it to a worker is the first step if uploads grow.
- [Local disk storage doesn't survive container replacement without a volume] → `CONTENT_DIR` volume in compose;
  object storage later.
- [Schedule changes reach streaming devices up to ~60 s late] → acceptable for day-granular ads; polling devices were
  already a minute behind.
- [An advertiser business name snapshot goes stale after a rename] → shown on devices only; `ad-review` can refresh it
  on file replacement. Low impact.
- [Placement ids as manifest item ids change when a file is replaced] → intended: a new file is a new item; plays stay
  attributed to the exact file shown.
- [The default rotation still plays on screens without ads] → keeps today's demo behavior and existing e2e; dropping
  it is a product decision for later.

## Migration Plan

1. One additive Prisma migration (new enums, tables, nullable/default columns). No backfill: existing businesses read
   `SCREEN_OWNER`; existing play logs have no placement and `house = false`.
2. API image: `apk add ffmpeg`; compose: mount a volume at `CONTENT_DIR`.
3. Rollback: the dashboard hides new routes if reverted; the migration only adds columns and tables, so an older API
   keeps working against the new schema.

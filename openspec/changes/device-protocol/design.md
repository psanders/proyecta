## Context

`/device/v1/register` and the `Device` model exist (bootstrap). The player demo plays `/dev/manifest`. Dashboard auth
and workspace guards come from `identity-auth`. See proposal.md for scope.

## Goals / Non-Goals

**Goals:** one API instance handling pairing and live status reliably; a player that pairs and plays end to end.
**Non-Goals:** multi-instance fan-out, persistence on the player across reboots, per-screen rotations.

## Decisions

- **Ownership by workspace accessKeyId.** `Screen.workspaceAccessKeyId` (Identity `WO…` id); every screen query filters
  by the active workspace and excludes `deletedAt`. Lookups of foreign screens return NOT_FOUND (no existence leak).
- **Bindings with DB-enforced invariants.** `DeviceBinding(deviceId, screenId, linkedAt, unlinkedAt)` with two partial
  unique indexes (`WHERE unlinked_at IS NULL`) on deviceId and on screenId, created in raw SQL in the migration. Linking
  runs in a transaction; a unique violation becomes a CONFLICT. This is what makes races produce exactly one link.
- **Device token**: 32 random bytes, base64url, returned once; SHA-256 stored on `Device.tokenHash`; rotated on every
  register. Devices send `Authorization: Bearer <token>`.
- **SSE without EventSource.** Browsers' EventSource can't set headers, so the player reads the stream with `fetch` +
  `ReadableStream` (Chromium ≥ 108) and parses `event:`/`data:` frames. Server writes `text/event-stream`, flushes an
  initial `state` event, then events; `: keep-alive` every 25 s.
- **Event hub**: an in-memory `EventEmitter` keyed by device id and by workspace. Pairing/unlink/heartbeat functions
  publish; SSE handlers and the tRPC status subscription subscribe. Single instance only (Postgres LISTEN/NOTIFY later).
- **Seen / status.** `Device.lastSeenAt` updated on register, state, heartbeat, play-logs and while a stream is open
  (every keep-alive). Status is computed at read time from `lastSeenAt` + open-stream registry, plus a 30 s sweeper that
  pushes status transitions (online→stale→offline) to dashboard subscribers.
- **Dashboard live status** via tRPC subscription over SSE (`httpSubscriptionLink`), scoped to the active workspace.
- **Default rotation**: the API loads `packages/api/.data/media/manifest.json` (generated demo ads) and serves media at
  `/media` (static, Range-capable). The version string is the manifest's `version`. Missing file → linked devices get an
  empty rotation and show an idle state.
- **Play log idempotency**: unique `(deviceId, itemId, startedAt)`; batches use `createMany({ skipDuplicates: true })`.
  Screen attribution resolves the binding whose `[linkedAt, unlinkedAt)` contains `startedAt`.
- **Rate limit**: in-memory token bucket, 10 link/check attempts per workspace per minute.
- **Player hardware id** (browser shell): `?hw=` from a shell if present, else a random id persisted in `localStorage`.
  Real shells pass their hardware id; the browser id only survives while site data does (documented).
- **Player sync loop**: stream → on 3 consecutive failures switch to polling `state` every 60 s ± 10 s jitter while
  retrying the stream with backoff (max 5 min). Heartbeat every 60 s. Play logs queued in memory and flushed every 30 s
  (lost on reload until player-core adds SQLite).

## Risks / Trade-offs

- [In-memory hub and rate limits reset on restart / don't scale out] → acceptable for one instance; devices reconnect and
  receive full state on reconnect.
- [Browser hardware id resets with site data → new code] → only affects the plain-browser shell; Android/kiosk pass real ids.
- [Proxies buffering SSE] → `X-Accel-Buffering: no`, keep-alives, and the polling fallback.
- [Play logs lost on player reload] → documented; fixed in player-core.

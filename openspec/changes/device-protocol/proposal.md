## Why

Owners need to register their screens, link a physical player to each one by typing the code the TV
shows, and see whether it is actually on air. The player needs a stable, versioned protocol to get its
permanent code, learn when it is linked or unlinked, receive what to play, and report health and plays,
even over poor connections.

## What Changes

- Screens as workspace resources: create, edit, list, view, archive, soft-delete, with the fields from the
  Pencil add-screen form (place type, indoor/outdoor, city, address, size, orientation, resolution,
  availability days and hours, reference price and pricing model).
- Pairing: link a device to a screen by its 8-character code (only when the device is online and unlinked),
  check a code before linking, unlink. Binding history is kept so plays stay attributable.
- Device protocol `/device/v1` (frozen, additive-only): `register` now also returns a device token; new
  `state`, `events` (server-sent events), `heartbeat` and `play-logs` endpoints.
- Screen status derived by the server (online, stale, offline, unlinked) and pushed live to the dashboard.
- Every linked screen plays the default rotation (the generated demo ads) until advertisers exist.
- Player: registers on boot, shows its real code, switches to playback when linked and back to pairing when
  unlinked, falls back to polling when the event stream fails, sends heartbeats and play logs.
- Non-goals: offline persistence across reboots on the player (player-core), per-screen content,
  scheduling, advertiser side, device shells.

## Capabilities

### New Capabilities
- `screens`: the screen inventory owned by a workspace and its lifecycle (active, archived, deleted).
- `device-pairing`: permanent device codes, linking, unlinking, binding history, device credentials.
- `device-sync`: the `/device/v1` protocol — state, live events, polling fallback, heartbeat, play logs, derived status.

### Modified Capabilities
<!-- none yet (identity-auth specs are not synced) -->

## Impact

- `packages/api`: Prisma models Screen, DeviceBinding, PlayLog, device token + health fields; tRPC `screens`
  router (+ status subscription); `/device/v1` handlers; in-memory event hub; default rotation loader.
- `packages/common`: screen, pairing and device protocol schemas (request/response + event union).
- `packages/player`: boot flow against the protocol (replaces `/dev/manifest`), event stream client, heartbeat, play-log upload.
- `scripts/generate-demo-ads.sh`: media served at `/media` as the default rotation.
- Depends on `identity-auth` (workspace guards).

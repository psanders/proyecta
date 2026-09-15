## Why

Screens currently carry a `priceReference` + `priceModel` (por hora/día/semana/mes) that was always a placeholder —
the product owner never decided the pricing unit, and nothing computes what anything actually costs. With
`device-protocol` and `owner-dashboard` shipped, screens report real play logs (item, duration, result), so we can
finally define one simple, unambiguous rate: **pay-per-display (PPD)** — a single price per every 5 seconds an ad
displays. This replaces the open pricing question with an answer that is easy for a vallero to understand ("cobras
X por cada 5 segundos") and gives owners a first read of what their screen is earning, derived from play logs they
already produce.

This also corrects the ad model: today's default rotation includes 8-second image ads, which cannot be billed
under a 5-second unit. Ad durations become a hard multiple of 5 seconds.

## What Changes

- **BREAKING** (device protocol, additive at the schema level but changes accepted values): manifest items'
  `durationMs` MUST be a multiple of 5000. Non-conforming manifests are rejected at load; the demo rotation
  generator is updated so every ad (image and video) lasts a multiple of 5 s.
- Screen pricing: `Screen.priceReference` + `Screen.priceModel` (por hora/día/semana/mes) are replaced by a single
  `Screen.ratePerFiveSecondsCents` (integer centavos of RD$). A screen is "incomplete" when this rate is missing,
  in place of the old price fields.
- New `accounting` capability: every billable play is priced at the screen's rate **snapshotted at play time**
  (a rate change never rewrites past earnings), in units of 5 seconds of the play's billed duration. Only
  `COMPLETED` plays are billable; `STALLED`/`FAILED` plays earn nothing. Billing uses the **planned** duration
  (the manifest item's `durationMs` at play time), not measured wall-clock duration, since a completed play is
  defined as reaching that planned end.
- Dashboard: add/edit screen's "Información comercial" section becomes one field, "Tarifa por 5 segundos (RD$)"
  (decimals allowed, e.g. RD$ 2.50). Screen detail's "Precio" card shows the rate; "Actividad publicitaria —
  Próximamente" becomes a real summary: billable seconds and earnings for today and the last 7 days.
- Migration: existing `priceReference`/`priceModel` data has no defined conversion (the pricing unit was never
  real), so it is dropped; screens revert to incomplete until an owner sets the new rate.
- Non-goals: advertiser-side charging, invoicing or payouts (no advertiser UI exists yet — this change only
  computes accounting facts from play logs); scheduling/dayparts or per-slot pricing; historical backfill of a
  rate for plays recorded before this change (there is no historical rate to snapshot, so pre-change plays are
  excluded from earnings — they predate PPD).

## Capabilities

### New Capabilities
- `accounting`: pay-per-display pricing — the per-screen rate, rate snapshotting at play time, which plays are
  billable, and the earnings/billable-seconds views an owner sees on the screen detail.

### Modified Capabilities
- `screens`: the "Create and edit screens" and "List and view screens" requirements change — reference price +
  pricing model are replaced by the PPD rate, and completeness is redefined around it. NOTE: the `screens`
  capability's current behavior lives only in `openspec/changes/device-protocol/specs/screens/spec.md` (that
  change is built and merged but not yet archived/synced to `openspec/specs/`); this change's delta is written
  against that spec text and must be reconciled if `device-protocol` syncs first.

## Impact

- `packages/api/prisma/schema.prisma`: drop `Screen.priceReference` / `Screen.priceModel` / `PriceModel` enum; add
  `Screen.ratePerFiveSecondsCents Int?`; add a billing snapshot column on `PlayLog` (rate + billed units at play
  time) so historical earnings never move.
- `packages/common/src/schemas/screen.schema.ts`: replace price fields with the rate field and Spanish labels;
  update `isScreenComplete`.
- `packages/common/src/schemas/manifest.schema.ts`: `durationMs` must be a multiple of 5000.
- New `packages/common/src/schemas/accounting.schema.ts` (or similar): billing math (seconds → units → centavos)
  and the earnings summary shape shared by API and dashboard.
- `packages/common/src/schemas/deviceProtocol.schema.ts`: `playLogBatchSchema` gains an optional `durationMs` per
  play (additive, frozen-contract-safe) — the player reports the ad's actual planned duration instead of the
  server inferring it after the fact.
- `packages/player/src/engine.ts` / `main.ts`: each reported play carries its item's planned `durationMs`.
- `packages/api/src/api/devices/createDeviceSyncFunctions.ts`: `createRecordPlayLogs` snapshots the screen's rate
  and billed units per play at insert time, preferring the device-reported duration and falling back to a
  rotation lookup only when it's absent (older players).
- `packages/api/src/api/screens`: new `accounting`-flavored read (earnings/billable seconds per screen, today and
  last 7 days) exposed over tRPC; screen views drop price fields for the rate.
- `packages/dashboard`: add/edit screen commercial section, screen detail "Precio" and "Actividad publicitaria"
  cards.
- `design/pencil.pen`: `add-screen`, `edit-screen`, `screen-detail` commercial sections.
- `scripts/generate-demo-ads.sh`: image ad duration 8000ms → a multiple of 5000ms.
- Depends on `device-protocol` (Screen, PlayLog, manifest) and `owner-dashboard` (the forms/cards being changed).

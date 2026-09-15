## Context

`Screen.priceReference` (Int, whole pesos) + `Screen.priceModel` (`PriceModel` enum: PER_HOUR/DAY/WEEK/MONTH) exist
today but nothing computes a price from them — they were a placeholder pending a real pricing unit (see
proposal.md). `PlayLog` already records `deviceId`, `screenId` (attributed by `DeviceBinding` history), `itemId`,
`codec`, `result` (COMPLETED/STALLED/FAILED), `startedAt`, `endedAt`, idempotent per `(deviceId, itemId,
startedAt)`. There is exactly one active rotation today (the generated demo ads, loaded from
`packages/api/.data/media/manifest.json` by `createRotationLoader`); every linked screen plays it. Advertiser
screens/uploads don't exist yet, so ad durations only change when someone regenerates the demo rotation.

## Goals / Non-Goals

**Goals:** a rate that survives change without corrupting history; a billing computation that's simple enough to
audit by hand; an owner-visible summary built entirely from data already flowing through `/device/v1`.

**Non-Goals:** advertiser billing/invoicing/payouts; per-item or per-advertiser earnings breakdowns (only
per-screen totals, per the product ask); multiple simultaneous rotations or per-screen content (that's a separate,
later change); backfilling earnings for plays recorded before this change ships.

## Decisions

- **Rate storage: integer centavos.** `Screen.ratePerFiveSecondsCents Int?`, e.g. RD$ 2.50 → `250`. Whole pesos in
  a float or decimal-as-float would risk rounding drift once multiplied by billed units across many plays;
  centavos as an integer make every calculation exact integer arithmetic. The dashboard form takes pesos with up
  to two decimals and converts ×100 (rejecting anything finer than a centavo, e.g. `2.505`, as a Spanish validation
  error — mirrors the existing `screenFieldsSchema` pattern of Spanish `ctx.addIssue` messages).
- **Snapshot on `PlayLog`, not a join to `Screen` at read time.** Add `PlayLog.billedUnits Int?` (planned duration
  ÷ 5000, only set for completed plays) and `PlayLog.rateCentsAtPlay Int?` (the screen's rate at the moment the
  play was recorded, `null` when the screen had no rate yet). Earnings for a play are always `billedUnits *
  rateCentsAtPlay` computed at read time from these two stored numbers — never from the screen's *current* rate.
  This is what makes "changing a screen's rate doesn't rewrite history" true by construction rather than by
  convention: even if `Screen.ratePerFiveSecondsCents` changes or is cleared, every already-recorded play keeps the
  numbers it was priced with. Alternative considered: store only a computed `earnedCents` and drop the rate/units
  split — rejected because keeping both makes the number auditable ("3 units × RD$2 = RD$6") in the UI and in
  support conversations, at the cost of two extra nullable int columns.
- **Planned duration travels with the play report; the rotation lookup is only a fallback.** `playLogBatchSchema`
  (frozen, additive-only under `/device/v1`) gains an **optional** `durationMs` on each play — additive, so old
  and new devices both stay valid. The player already knows the exact planned duration of what it just played
  (`PreparedItem.item.durationMs` in `packages/player/src/engine.ts`), so it reports that duration for every play,
  removing the earlier design's dependency on looking anything up server-side after the fact. This is what makes
  "rotation changed while the TV was offline" bill correctly: the device reports the duration of the ad it
  actually displayed, not whatever the rotation says today. `createRecordPlayLogs`:
  1. If `play.durationMs` is present: use it when it's a positive multiple of 5000; otherwise the play is stored
     but **not** billable (no fallback — a device that reports a bad number gets no free pass to the rotation
     lookup, since that could silently misprice it).
  2. If `play.durationMs` is absent (an older player that hasn't updated): fall back to looking up `item.durationMs`
     in the currently loaded default rotation by `itemId`, same as the original design — needed only for
     backward compatibility during rollout.
  A play whose duration can't be determined either way gets `billedUnits = null` (not billable, still stored for
  diagnostics — same posture as a stalled/failed play). The schema does not itself enforce the 5000 ms-multiple
  rule on this field (kept a plain positive integer) so a single malformed value can't fail the whole batch
  upload; the multiple-of-5000 check is business logic in `createRecordPlayLogs`, not request validation.
- **Billable = COMPLETED only, priced by planned not measured duration.** A completed play is defined by
  `player-core`/engine as reaching the slot's planned end (`engine.ts` sets a timer for exactly `durationMs`), so
  "completed" already means "played its full planned duration" — using the planned duration for billing is
  consistent with what "completed" means, and immune to clock skew between device and server. Stalled/failed plays
  bill zero regardless of how much of the ad actually rendered — v0 has no partial-credit model.
- **5-second multiple enforced in `manifestItemSchema`** (`durationMs` refined to `% 5000 === 0`, replacing the
  current `min(1000)`-only check). This is the single validation point every current and future path funnels
  through: the demo rotation loader (`events/rotation.ts`) already rejects a manifest that fails `manifestSchema`
  wholesale (falls back to `null`, i.e. no rotation) — no new rejection path needed, just a stricter item schema.
  Any future ad-upload endpoint inherits the same constraint for free by reusing the schema.
- **Owner view leads with plays and money, not seconds.** The screen detail's "Actividad publicitaria" card reads
  "Hoy · 12 reproducciones · RD$ 30.00" / "Últimos 7 días · 180 reproducciones · RD$ 450.00" (singular "1
  reproducción"), matching how a vallero actually thinks about it ("cuántas veces se vio, cuánto gané"). Billable
  seconds stay in the `screens.earnings` API response (useful for future reporting/debugging) but aren't rendered.
- **Earnings summary: two windows, computed on read, no new persisted aggregate table.** "Today" and "last 7 days"
  in `America/Santo_Domingo` are common enough, and `PlayLog` volume for v0 (one screen, one rotation) is small
  enough, that a `groupBy`/`aggregate` Prisma query per screen view is simpler and safer than maintaining rollup
  rows. Add `@@index([screenId, result, startedAt])` on `PlayLog` (extends the existing `[screenId, startedAt]`
  index) so the aggregate filters efficiently. If volume grows, this is the first thing to swap for a materialized
  rollup — noted as a risk below, not designed now.
- **Migration drops the old fields outright.** `priceReference`/`priceModel` never represented a real, computed
  price (product owner confirmed the pricing unit was an open question), so there is no meaningful value to carry
  forward. The Prisma migration drops both columns and the `PriceModel` enum, and adds
  `ratePerFiveSecondsCents`/the two `PlayLog` snapshot columns. Every existing screen becomes incomplete until an
  owner sets a rate — same posture as a screen missing hours today.

## Risks / Trade-offs

- [Older players (no `durationMs` in their play-log batch) still fall back to the *current* rotation at upload
  time, not the rotation active when the ad actually played] → acceptable as a rollout-compatibility path only;
  every current player build reports its own duration, so this only matters for devices that haven't updated yet.
- [Per-screen aggregate query on every screen-detail view] → cheap at v0 volume (one demo rotation, few devices);
  the new composite index keeps it an index range scan; watch `PlayLog` row counts before player-shells/broader
  rollout.
- [Dropping `priceReference`/`priceModel` loses any manually-entered reference prices] → acceptable per product
  owner: those values never fed a real computation, and every screen already re-enters commercial info under the
  new single field.

## Migration Plan

1. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` into a new
   timestamped migration after editing `schema.prisma` (drop `priceReference`, `priceModel`, `PriceModel` enum; add
   `ratePerFiveSecondsCents` on `Screen`; add `billedUnits`, `rateCentsAtPlay` on `PlayLog`; add the composite
   index).
2. `npx prisma migrate deploy` against the dev database and again with `TEST_DATABASE_URL` (interactive `migrate
   dev` is not usable in this workflow).
3. Regenerate the demo rotation (`scripts/generate-demo-ads.sh`) so every item's `durationMs` is a multiple of 5000
   (image ads move from 8000ms to a 5-second-aligned duration).
4. No data backfill: existing screens simply lose their old price fields and start incomplete; existing `PlayLog`
   rows get `billedUnits`/`rateCentsAtPlay` as `null` (not billable — they predate PPD, matching the proposal's
   non-goal on historical backfill).

## 1. Pencil design (human-gated)

- [x] 1.1 Update `add-screen` (Y2jVW) and `edit-screen` (h9a2Qh) "Información comercial" section to a single PPD
      rate field with a helper example, removing the "Modelo de precio" select entirely; verified with
      TakeScreenshot
- [x] 1.2 Update `screen-detail` "Precio" (GVMr9) and "Actividad publicitaria" (qpw6k) cards to show the rate and
      a plays+earnings summary ("Hoy · 12 reproducciones · US$ 30.00"); verified with TakeScreenshot and confirmed
      no overlap with the concurrently-edited "Estado del dispositivo" card, header actions or
      `screen-detail-more-menu` (now merged to main)

## 2. Data model

- [x] 2.1 Prisma: drop `Screen.priceReference`, `Screen.priceModel`, the `PriceModel` enum; add
      `Screen.ratePerFiveSecondsCents Int?`; add `PlayLog.billedUnits Int?`, `PlayLog.rateCentsAtPlay Int?`, and
      `@@index([screenId, result, startedAt])`; verified with `npx prisma migrate diff --from-config-datasource
      --to-schema prisma/schema.prisma --script` into `prisma/migrations/20260914223000_pay_per_display/`, then
      `npx prisma migrate deploy` against the dev database and against `TEST_DATABASE_URL`

## 3. Contracts (`@proyecta/common`)

- [x] 3.1 `screen.schema.ts`: replace `priceReference`/`priceModel` with a validation-only
      `ratePerFiveSecondsDollars` field (US dollars, up to 2 decimals, no schema-level transform) plus an exported
      `rateDollarsToCents()` conversion function. **Deviation from the original plan:** a schema `.transform()`
      (dollars ×100 → cents) is unsafe here because this codebase validates mutation input twice — once at the tRPC
      boundary (`validate(schema)`) and again inside the validated function
      (`withErrorHandlingAndValidation(fn, schema)`) — so a non-idempotent transform silently double-converts
      (2.5 → 250 → 25000), caught by the integration test (5.4). Fixed by keeping the schema pure validation and
      calling `rateDollarsToCents()` exactly once, in `createCreateScreen`/`createUpdateScreen`, at the point of
      writing to the database. Updated `isScreenComplete` to check `ratePerFiveSecondsCents` (the stored, already-
      converted field) instead of the old price fields; verified unit tests including the sub-cent rejection
      case
- [x] 3.2 `manifest.schema.ts`: refine `durationMs` to require a multiple of 5000 (replacing the `min(1000)`-only
      check) with a Spanish-friendly error; verified unit tests for both a valid multiple and a rejected non-multiple
- [x] 3.3 `deviceProtocol.schema.ts`: add an optional `durationMs` (plain int, no positivity or multiple-of-5000
      constraint at the schema level — a zero/negative/non-multiple value must still be accepted and stored, just
      not billed, per the accounting spec) to each play in `playLogBatchSchema` — additive, frozen-contract-safe;
      verified by the integration test (5.4) posting batches with and without the field
- [x] 3.4 New `accounting.schema.ts`: billing math helpers (`unitsForDurationMs` — positive multiple of 5000 only,
      else `null`; `centsForPlay` — units × rate) and the earnings-summary response shape (per-window plays,
      billable seconds, earnings cents; "unavailable" variant) shared by API and dashboard; verified unit tests for
      the math (including a fractional-rate example, the completed-only rule, and the invalid-duration case)

## 4. Player

- [x] 4.1 `engine.ts`: add `durationMs` to `PlayRecord`, populated from `item.durationMs` (the item's real planned
      duration, not the test-only `maxSlotMs`-capped value) in `record()`. No jsdom/DOM test harness exists in
      `packages/player` (existing unit tests avoid `PlaybackEngine`, which creates real `<video>`/`<img>` elements
      in its constructor) — adding one for a single field was judged disproportionate; verified instead by the
      real-browser Playwright e2e (`e2e/player.spec.ts`), which now asserts every reported play's `durationMs` is
      a positive multiple of 5000
- [x] 4.2 `main.ts`: include `durationMs` when pushing to `queuedPlays` in the `onPlay` hook, so every flushed
      batch reports it; verified by the same e2e (the assertion reads `window.__proyecta.plays`, populated from
      the same `record` object pushed into `queuedPlays`) and by the integration test (5.4) on the server side

## 5. API

- [x] 5.1 `createRecordPlayLogs`: for each COMPLETED play, use `play.durationMs` when it's a positive multiple of
      5000; if present but invalid, not billable (no fallback); if absent, fall back to looking up `item.durationMs`
      in the currently loaded rotation by `itemId` (backward compatibility for older players). Snapshot
      `billedUnits` and `rateCentsAtPlay` (the resolved screen's current rate, null if unset) at insert time;
      verified unit tests (`createDeviceSyncFunctions.test.ts`) for: reported valid duration, reported invalid
      duration (no fallback), absent duration with rotation fallback, no screen rate, unattributed play, stalled
      play, empty batch
- [x] 5.2 New validated function `createGetScreenEarnings`: aggregates billable `PlayLog` rows for a screen into
      today's and last-7-days' billable plays, billable seconds and earnings (US$, `America/Santo_Domingo`
      calendar days), returning "unavailable" when the screen has no rate; verified unit tests for both windows,
      the calendar-day boundary, and the no-rate/not-found cases
- [x] 5.3 tRPC `screens` router: expose `screens.earnings`, scoped to the workspace like `get`; screen views
      (`toScreenView`) drop price fields in favor of `ratePerFiveSecondsCents`; verified via the existing router
      unit tests plus the integration test
- [x] 5.4 Integration test (`deviceProtocol.test.ts`): register a device, report a batch of plays (device-reported
      duration, omitted duration with rotation fallback, invalid duration, stalled) against a screen with a rate,
      then a rate change, then another play; assert `screens.earnings` and the raw `PlayLog` snapshot rows match
      the design's "rate change doesn't rewrite history" scenario; updated the fixture rotation's `durationMs`
      (8000 → 10000)

## 6. Dashboard

- [x] 6.1 `ScreenFormPage`: replaced the two commercial fields with a single `rate` field (US dollars input,
      `hint` helper text); `toInput()` sends `ratePerFiveSecondsDollars`; pre-fill converts the stored cents back
      to a 2-decimal dollars string; verified typecheck + the Playwright flow (6.2) saving and redisplaying the rate
- [x] 6.2 `ScreenDetailPage`: "Precio" card shows the rate (`formatCents`); "Actividad publicitaria" card renders
      "Hoy · N reproducciones · US$X" / "Últimos 7 días · N reproducciones · US$X" as single lines (`formatPlays`
      singularizes "1 reproducción"), or the no-rate message when `screens.earnings` reports unavailable; verified
      by `e2e/dashboard.spec.ts`, which now asserts the rate and both activity lines are visible after saving a
      screen with a rate
- [x] 6.3 Updated `strings.ts` (removed `priceModel`/`reference`/`model`/`activityBody`, added
      `rate`/`ratePlaceholder`/`rateHelper`/`noRate`/`today`/`last7Days`) and removed `PRICE_MODEL_LABELS` from
      `screen.schema.ts`; verified typecheck (no leftover references to removed price fields)

## 7. Demo assets

- [x] 7.1 `scripts/generate-demo-ads.sh`: changed every image ad duration from 8000ms to 10000ms; regenerated the
      demo rotation and confirmed every item's `durationMs % 5000 === 0` (images 10000ms; videos already 10000ms/
      10000ms/15000ms)

## 8. Verification

- [x] 8.1 Full green gate: `npm run lint && npm run typecheck && npm test` (92 unit tests), `npm run
      test:integration` (16 tests), `npm run test:e2e` (3 tests) — all green

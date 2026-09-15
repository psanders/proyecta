## 1. Pencil design (human-gated)

- [x] 1.1 Update `add-screen` (Y2jVW) and `edit-screen` (h9a2Qh) "Información comercial" section to a single PPD
      rate field with a helper example, removing the "Modelo de precio" select entirely; verified with
      TakeScreenshot
- [x] 1.2 Update `screen-detail` "Precio" (GVMr9) and "Actividad publicitaria" (qpw6k) cards to show the rate and
      a plays+earnings summary ("Hoy · 12 reproducciones · RD$ 30.00"); verified with TakeScreenshot and confirmed
      no overlap with the concurrently-edited "Estado del dispositivo" card, header actions or
      `screen-detail-more-menu` (now merged to main)

## 2. Data model

- [ ] 2.1 Prisma: drop `Screen.priceReference`, `Screen.priceModel`, the `PriceModel` enum; add
      `Screen.ratePerFiveSecondsCents Int?`; add `PlayLog.billedUnits Int?`, `PlayLog.rateCentsAtPlay Int?`, and
      `@@index([screenId, result, startedAt])`; verify with `npx prisma migrate diff --from-config-datasource
      --to-schema prisma/schema.prisma --script` into a new timestamped migration folder, then `npx prisma migrate
      deploy` against the dev database and against `TEST_DATABASE_URL`

## 3. Contracts (`@proyecta/common`)

- [ ] 3.1 `screen.schema.ts`: replace `priceReference`/`priceModel` fields with `ratePerFiveSecondsCents` (accepts
      pesos with up to 2 decimals, transforms ×100 into integer centavos, rejects negative or sub-centavo input
      with Spanish messages); update `isScreenComplete`; verify unit tests including the sub-centavo rejection case
- [ ] 3.2 `manifest.schema.ts`: refine `durationMs` to require a multiple of 5000 (replacing the `min(1000)`-only
      check) with a Spanish-friendly error; verify unit tests for both a valid multiple and a rejected non-multiple
- [ ] 3.3 `deviceProtocol.schema.ts`: add an optional `durationMs` (positive int, no multiple-of-5000 constraint at
      the schema level) to each play in `playLogBatchSchema` — additive, frozen-contract-safe; verify a unit/type
      check that a batch without `durationMs` still parses (backward compatibility)
- [ ] 3.4 New `accounting.schema.ts`: billing math helpers (`unitsForDurationMs` — positive multiple of 5000 only,
      else `null`; charge from units × rate) and the earnings-summary response shape (per-window plays, billable
      seconds, earnings cents; "unavailable" variant) shared by API and dashboard; verify unit tests for the math
      (including a fractional-rate example, the completed-only rule, and the invalid-duration case)

## 4. Player

- [ ] 4.1 `engine.ts`: add `durationMs` to `PlayRecord`, populated from `item.durationMs` (the item's real planned
      duration, not the test-only `maxSlotMs`-capped value) in `record()`; verify unit test asserts the reported
      duration
- [ ] 4.2 `main.ts`: include `durationMs` when pushing to `queuedPlays` in the `onPlay` hook, so every flushed
      batch reports it; verify unit/integration coverage that a flushed play carries `durationMs`

## 5. API

- [ ] 5.1 `createRecordPlayLogs`: for each COMPLETED play, use `play.durationMs` when it's a positive multiple of
      5000; if present but invalid, not billable (no fallback); if absent, fall back to looking up `item.durationMs`
      in the currently loaded rotation by `itemId` (backward compatibility for older players). Snapshot
      `billedUnits` and `rateCentsAtPlay` (the resolved screen's current rate, null if unset) at insert time;
      verify unit tests for: reported valid duration, reported invalid duration (no fallback), absent duration
      with rotation fallback, absent duration with unknown item, stalled/failed play
- [ ] 5.2 New validated function (e.g. `createGetScreenEarnings`): aggregates billable `PlayLog` rows for a screen
      into today's and last-7-days' billable plays, billable seconds and earnings (RD$, `America/Santo_Domingo`
      calendar days), returning "unavailable" when the screen has no rate; verify unit tests for both windows,
      singular/plural play counts, and the no-rate case
- [ ] 5.3 tRPC `screens` router: expose the earnings read (e.g. `screens.earnings`), scoped to the workspace like
      `get`; screen views (`toScreenView`) drop price fields in favor of the rate; verify router unit tests
- [ ] 5.4 Integration test: register a device, report a batch of plays with `durationMs` (mixed results, one with
      an invalid duration, one omitting `durationMs` against a rotation with a matching item) against a screen with
      a rate, then a rate change, then more plays; assert stored snapshots and that the earnings query matches the
      design's "rate change doesn't rewrite history" and "rotation changed while offline" scenarios; update the
      existing `deviceProtocol.test.ts` fixture rotation's `durationMs` (8000 → a multiple of 5000)

## 6. Dashboard

- [ ] 6.1 `ScreenFormPage`: replace the two commercial fields with the single rate field (pesos input, helper text
      showing an example conversion); verify Playwright: saving a fractional rate round-trips exactly
- [ ] 6.2 `ScreenDetailPage`: "Precio" card shows the rate; "Actividad publicitaria" card shows
      "Hoy · N reproducciones · RD$X" / "Últimos 7 días · N reproducciones · RD$X" (singular for 1) or the no-rate
      message; verify Playwright: a screen with recorded plays shows the right counts/singular form, a screen
      without a rate shows the no-rate message
- [ ] 6.3 Update dashboard strings (`strings.ts`) and remove any `PRICE_MODEL_LABELS`-only usages; verify
      typecheck (no leftover references to removed price fields)

## 7. Demo assets

- [ ] 7.1 `scripts/generate-demo-ads.sh`: change image ad duration from 8000ms to a 5-second-aligned duration (e.g.
      10000ms); verify by regenerating the demo rotation and confirming every item's `durationMs % 5000 === 0`

## 8. Verification

- [ ] 8.1 Full green gate: `npm run lint && npm run typecheck && npm test`, `npm run test:integration`, `npm run
      test:e2e`

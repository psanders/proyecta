# Ship checkpoint — pay-per-display

Started: 2026-09-14
Current stage: 3 — Build

**Scope:** Replace the screen's "reference price + pricing model" with a single pay-per-display (PPD) rate: RD$
per every 5 seconds displayed, stored in integer centavos. Ad durations must be a multiple of 5 seconds. Each play
snapshots the screen's rate at record time so later rate changes never rewrite history; only COMPLETED plays are
billable, priced by planned (not measured) duration. New `accounting` capability computes a per-screen
today/last-7-days earnings summary from play logs, shown on the screen detail in place of "Actividad publicitaria
— Próximamente". Advertiser-side charging stays out of scope.

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | |
| 1 | Design (Pencil) | done | Approved by product owner with 2 tweaks (player-reported durationMs; activity card leads with plays+money) + remove (not disable) Modelo de precio select. Both applied in Pencil and verified with TakeScreenshot. |
| 2 | Spec reconcile | done | accounting spec Billable-plays/Screen-earnings-summary requirements + design.md updated for both tweaks; `openspec validate --strict` clean (same expected screens-spec INFO as before). |
| 3 | Build | in-progress | |
| 4 | Test | pending | |
| 5 | Sync | pending | Human gate |
| 6 | Archive | pending | Human gate |

## Decision log

- 2026-09-14 — Pencil design done: add-screen (Y2jVW) and edit-screen (h9a2Qh) "Información comercial" reduced to one field "Tarifa por 5 segundos (RD$)" + helper "Ej.: un anuncio de 15 s = 3 × tarifa"; old "Modelo de precio" select disabled (enabled:false — can't hard-delete a component-instance descendant). Also fixed leftover Colombian-peso placeholder copy ("COP" → RD$) while touching this section. screen-detail Precio card (GVMr9) now shows "Tarifa por 5 segundos → RD$ 2.50" (Modelo row disabled). Actividad publicitaria card (qpw6k) replaced the "Próximamente" lock/text with a bar_chart icon and two rows (Hoy / Últimos 7 días, each "Xs · RD$Y"). Built entirely with Copy()+Update() per the known Insert() +50px/blank-screenshot bug — no Insert() used. add-screen/edit-screen frame height bumped 1470→1520 to fit the added helper line (verified visually; the "Cancel Button fully clipped" warning is pre-existing noise from an already-disabled Cancel button, unrelated to this change).
- 2026-09-14 — Checkpoint created; openspec change `pay-per-display` proposed and validated (proposal, specs/accounting, specs/screens delta, design, tasks). `openspec validate` gives an expected INFO: `screens` main spec doesn't exist yet (device-protocol not synced/archived) — noted as a dependency in the proposal.
- 2026-09-14 — Rate storage: integer centavos of RD$ per 5s (`Screen.ratePerFiveSecondsCents`) — exact fractional pesos (e.g. RD$2.50), no float drift.
- 2026-09-14 — Billing snapshot on `PlayLog` (`billedUnits`, `rateCentsAtPlay`) at record time, not a join to the screen's current rate — makes "rate change doesn't rewrite history" true by construction.
- 2026-09-14 — Billable = COMPLETED only, priced by planned duration (looked up by itemId against the currently loaded rotation at play-log record time, since the frozen `/device/v1` play-log schema doesn't carry duration).
- 2026-09-14 — Manifest `durationMs` must be a multiple of 5000ms (schema-level, common validation point for the demo loader and any future ad ingestion).
- 2026-09-14 — Migration drops `priceReference`/`priceModel`/`PriceModel` outright (no real value to carry forward); screens become incomplete until a rate is set.

# Ship checkpoint — device-protocol

Started: 2026-09-14
Current stage: 6 — Archive (done)

**Scope:** Screens as workspace resources (create/edit/list/archive/delete), pairing by permanent device code with DB-enforced binding invariants, and the frozen `/device/v1` protocol (state, SSE events, heartbeat, play logs) with derived live status. The demo player moves onto the protocol.

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | |
| 1 | Design (Pencil) | skipped | Backend + existing player screens; dashboard UI is designed in owner-dashboard |
| 2 | Spec reconcile | done | |
| 3 | Build | done | screens/pairing/device-sync functions, /device/v1 SSE, tRPC screens + onStatus, player on protocol |
| 4 | Test | done | 46 API + 13 common + 9 player unit; 15 integration; Playwright pair→play→unlink green |
| 5 | Sync | done | screens, device-pairing and device-sync synced as new main specs (openspec/specs/); `openspec validate --strict` clean |
| 6 | Archive | done | Moved to openspec/changes/archive/2026-09-15-device-protocol |

## Decision log

- 2026-09-14 — Media for the default rotation served at /media (dev router and /dev/manifest removed).
- 2026-09-14 — SSE parser shared in @proyecta/common (player + integration tests).
- 2026-09-14 — Browser shell hardware id: ?hw= or ProyectaShell bridge, else localStorage random id (documented limitation).
- 2026-09-14 — Migration SQL generated with `prisma migrate diff` (migrate dev is interactive-only); partial unique indexes appended by hand.

- 2026-09-14 — Checkpoint created.
- 2026-09-15 — Re-verified green on current main (db:generate, eslint, typecheck, full `npm test`) before sync. Synced delta specs into new main specs `openspec/specs/screens/spec.md`, `openspec/specs/device-pairing/spec.md` and `openspec/specs/device-sync/spec.md` (all brand-new capabilities, ADDED requirements only). `openspec validate --strict` clean for the change and all three specs. Archived to `openspec/changes/archive/2026-09-15-device-protocol`. Branched off `origin/main` directly (not stacked on the still-unmerged identity-auth PR #8) since the two changes touch disjoint files.

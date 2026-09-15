# Ship checkpoint — ad-review

Started: 2026-09-15
Current stage: 5 — Sync (waiting for PR review and merge)

**Scope:** Owners decide on other businesses' ads on their screens: requests inbox with a pending count, approve per
screen (unchecked ones declined), reject with reasons, approval reuse, stop (revoke), "Sin respuesta"; advertisers see
Rechazado / Detenido por el vallero / Sin respuesta / Requiere atención with reasons. In-app only.

**Detected surfaces:** OpenSpec: yes · Pencil: yes (main checkout's design/pencil.pen) · Storybook: no · E2E: yes

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | proposal, specs (ad-review, ads, device-sync, workspace-view), design, tasks; validate --strict ok |
| 1 | Design (Pencil) | done | section "6 · Ad review (owner approval)": owner-requests, owner-request-review, owner-reject-dialog, owner-revoke-dialog, advertiser-ad-detail-attention; review in the PR. Needs saving in Pencil + committing from main |
| 2 | Spec reconcile | done | create/add only notify screens whose placement starts approved (behavior unchanged for players) |
| 3 | Build | done | common schemas/statuses, migration, API review functions + reuse, router, dashboard pages, banner, screen card |
| 4 | Test | done | lint, typecheck, prettier; unit 225; integration 19/19; e2e 18/18 (new e2e/adReview.spec.ts) |
| 5 | Sync | pending | gate: after PR merge |
| 6 | Archive | pending | gate: after PR merge |

Status values: `pending` · `in-progress` · `done` · `skipped` (with reason).

## Decision log

Newest first. One line per meaningful decision or stage transition.

- 2026-09-15 — Rebased onto main after #26 and #23 (config/proyecta.json); worktree config points at proyecta_ads DBs.
- 2026-09-15 — Branch feat/ad-review stacked on chore/sync-archive-advertiser-ads (#26, open) so synced specs exist.
- 2026-09-15 — A request is derived (ad × owner business), not stored; decisions live on AdPlacement.
- 2026-09-15 — User: notifications in-app only for now (no emails in ad-review).

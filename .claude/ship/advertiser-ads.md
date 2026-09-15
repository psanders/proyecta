# Ship checkpoint — advertiser-ads

Started: 2026-09-15
Current stage: 5 — Sync (waiting for PR review and merge)

**Scope:** The advertiser side: asset library with automated checks and renditions, ads on catalog screens with
placements (own screens approved, others pending and never playing), per-screen rotations, house plays and separate
earnings/spend, plus the per-business dashboard view (owner / advertiser / both). Owner review is `ad-review`.

**Detected surfaces:** OpenSpec: yes · Pencil: yes (main checkout's design/pencil.pen) · Storybook: no · E2E: yes

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | proposal, specs (workspace-view, advertiser-assets, ads, device-sync, accounting), design, tasks; validate --strict ok |
| 1 | Design (Pencil) | done | section "5 · Advertiser & dashboard view" in main checkout's pencil.pen; review in the PR (user asked to go straight to a PR). Needs saving in Pencil + committing from main |
| 2 | Spec reconcile | done | cancel no longer withdraws placements (spec + design updated); welcome step documented in design |
| 3 | Build | done | common schemas, migration, API (uploads, assets, ads, rotation, attribution), dashboard pages, infra |
| 4 | Test | done | lint + typecheck + prettier; unit 202; integration 18/18; e2e 17/17 (new e2e/advertiser.spec.ts) |
| 5 | Sync | pending | gate: after PR merge |
| 6 | Archive | pending | gate: after PR merge |

Status values: `pending` · `in-progress` · `done` · `skipped` (with reason).

## Decision log

Newest first. One line per meaningful decision or stage transition.

- 2026-09-15 — `.gitignore` had `ads/` (any folder named ads) which hid `routes/ads` and `api/ads` from git and Tailwind; anchored to `/ads/`.
- 2026-09-15 — Rebased onto origin/main (english routes #16); new dashboard routes are English.
- 2026-09-15 — Upload over plain Express route with streamed body (tRPC FormData buffers in memory).
- 2026-09-15 — Cancel sets Ad.state only; placements untouched (cancelled ads still list their screens).
- 2026-09-15 — Worktree uses isolated databases `proyecta_ads` / `proyecta_ads_test` so migrations don't touch other sessions.
- 2026-09-15 — Business setting named `dashboardView` (trpc.profile already means the personal profile).
- 2026-09-15 — User: "Make it happen and only stop if you have any question… get to a PR." Human design gate folded into PR review.
- 2026-09-15 — Checkpoint created; research in openspec/research/advertiser-ads-and-workspace-view.md.

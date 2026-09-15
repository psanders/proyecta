# Ship checkpoint — screen-details

Started: 2026-09-15
Current stage: 1 — Design (awaiting product-owner approval)

**Scope:** description, coordinates (required for completeness), curated tags, normalized resolution with derived
tier and aspect ratio, on the add/edit screen forms and the screen detail page.

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | Proposal, design, spec delta, tasks in openspec/changes/screen-details |
| 1 | Design (Pencil) | awaiting approval | add-screen, edit-screen, add-screen-from-onboarding (description, coordinates + Maps link, resolution preset + derived hint, Etiquetas card); screen-detail Información card (description, resolution tier/aspect, coordinates + map link, tags). Dashboard frames regrouped into labeled rows. |
| 2 | Spec reconcile | pending | |
| 3 | Build | in progress | Common + API + migration done (PR #17 merged into chore/english-routes, NOT main; content lives on feat/screen-details, up to date with main). Dashboard inputs + detail cards not built. |
| 4 | Test | pending | |
| 5 | Sync | pending | Human gate |
| 6 | Archive | pending | Human gate |

## Decision log

- 2026-09-15 — Internals English: tag ids, route paths and query params (chore/english-routes, stacked below this branch).
- 2026-09-15 — Tag catalog in `@proyecta/common`; labels in dashboard message catalogs (es/en). Geo required for completeness.
- 2026-09-15 — Build started before design by mistake; paused at common + API, resumed design first per product owner.
- 2026-09-15 — Pencil: dashboard screens regrouped at x=1400 into rows 0 Components, 1 Auth & onboarding, 2 Screens list, 3 Screen detail/add/edit, 4 Account & business, with section label frames.

- 2026-09-15 — Handoff. Design edits are uncommitted in the MAIN checkout's `design/pencil.pen`, now on local branch `design/screen-details` (no upstream; based on origin/main). Frames: add-screen, edit-screen, add-screen-from-onboarding, screen-detail (row 3 of the DASHBOARD section at x=1400). Next: product owner approves → build dashboard inputs (coordinates via `parseCoordinates` + hint via `resolveApiMessage`, resolution presets + tier/aspect hint, tag chips from `SCREEN_TAG_GROUPS` with `tag.<id>`/`tagGroup.<group>` labels in dashboard es/en catalogs) and detail cards → Playwright (create screen with coordinates + tags → complete) → commit pencil.pen → one PR from feat/screen-details to main. Coordinates are required for completeness, so dashboard inputs must ship together with the API change.

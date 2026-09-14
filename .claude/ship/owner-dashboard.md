# Ship checkpoint — owner-dashboard

Started: 2026-09-14
Current stage: 1 — Design (in progress, partially blocked)

**Scope:** Pencil components for every repeated dashboard block and the missing screens (sign up, password recovery, invitations, team, lifecycle dialogs, archived list, workspace switcher), then the Pencil-faithful React dashboard wired to identity-auth and device-protocol with live status.

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | |
| 1 | Design (Pencil) | in-progress | Components frame started (status badges, stat card, page header, back link). Newly inserted nodes don't lay out/render in the Pencil session (copies do) — needs the Pencil window in front / reload |
| 2 | Spec reconcile | done | Onboarding scenario: link happens when the add-screen form is saved; icons + port 5175 in design.md |
| 3 | Build | done (pending design approval) | All pages built from the existing Pencil screens; revisit after new Pencil components/frames are approved |
| 4 | Test | done | 5 dashboard unit + Playwright: sign up → onboarding pairing → En línea → unlink → archive; invite → Mailpit → accept → Activo |
| 5 | Sync | pending | Human gate |
| 6 | Archive | pending | Human gate |

## Decision log

- 2026-09-14 — Dashboard dev port 5175 (qcobro webapp holds 5173); Identity invite/reset URLs updated.
- 2026-09-14 — Pencil: new Insert()-created nodes lay out with a +50px offset and don't render in screenshots (Copy() works); blocked pending the user bringing Pencil to front / reloading the file.

- 2026-09-14 — Icons: Material Symbols Sharp (the set used in Pencil) via @material-symbols/svg-400, not lucide.
- 2026-09-14 — Checkpoint created.

# Ship checkpoint — dashboard-dark-mode

Started: 2026-09-15
Current stage: done

**Scope:** Owner dashboard dark mode. An Apariencia preference (Sistema/Claro/Oscuro) on Mi perfil, remembered per browser and applied before first paint, using the Pencil Lunaris `Mode` Dark values. In Pencil, dashboard screens and `Dashboard/*` components get rebound to `$--` variables, so flipping a frame's `Mode` theme previews dark.

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | Change created and validated |
| 1 | Design (Pencil) | done | Approved 2026-09-15. Edits live in the MAIN checkout's design/pencil.pen, not the worktree copy |
| 2 | Spec reconcile | done | Design matched the proposed spec; no changes; `openspec validate` passes |
| 3 | Build | done | lib/theme.ts store + useTheme hook, dark tokens in index.css, pre-paint script in index.html, ThemeSwitch on ProfilePage (moved from the account menu after review), 3 icons, strings |
| 4 | Test | done | 6 theme unit tests (incl. invalid stored value + invalid set); Playwright theme test; lint + typecheck + all unit suites green; final full e2e 15/15 |
| 5 | Sync | done | Approved after PR #11 merged; created openspec/specs/dashboard-appearance |
| 6 | Archive | done | Archived as 2026-09-15-dashboard-dark-mode |

Status values: `pending` · `in-progress` · `done` · `skipped` (with reason).

## Decision log

Newest first. One line per meaningful decision or stage transition.

- 2026-09-15 — PR #11 merged (a00b915). Product owner approved sync + archive: `openspec archive` created `openspec/specs/dashboard-appearance` (Purpose filled in) and archived as `2026-09-15-dashboard-dark-mode`, on branch chore/sync-archive-dashboard-dark-mode. Merged feat/dark-mode branch deleted.
- 2026-09-15 — PR #11 opened (feat/dark-mode → main, rebased on origin/main 9d5150c). Per the product owner, it includes the whole saved pencil.pen (with the ad-v2 creatives) and design/images. Sync and archive still pending their gates.
- 2026-09-15 — Product owner reviewed the live dashboard: control moved out of the account menu into Mi perfil. Pencil: removed Tema from `Dashboard/Account Menu`; new `profile` frame (z7nmZp, copied from workspace-settings) with Datos personales, Contraseña and an Apariencia card (applies on click, no save button). Spec/proposal/design/tasks updated and valid. Code: `components/ThemeSwitch.tsx` (radiogroup "Apariencia") on ProfilePage, removed from AppSidebar, profile subtitle updated. The product owner had flipped several Pencil screens to Dark meanwhile; those were left as they were. Re-verified: lint, typecheck, unit (11), full e2e 15/15. Waiting on the design/sync gate again.
- 2026-09-15 — Tests: full e2e run 1 had 13/15, with the player pairing tests failing because the fresh worktree lacked gitignored `packages/api/.data/media` (copied from main). Run 2 had 14/15, with the invite test (Mailpit) failing only under parallel workers; it passes 3/3 alone and passed in run 1, so it's a pre-existing flake. Worktree setup also needed `packages/api/.env` copied and `npm run db:generate`.
- 2026-09-15 — Build: theme store is a small DI store (storage/media/root injected) like session.ts, rather than a validated function (UI glue; no zod in dashboard). An invalid preference is rejected with TypeError before persisting. Stored key `proyecta.dashboard.theme`, mirrored in the index.html pre-paint script. Menu items use role=menuitemradio inside group "Tema"; selecting doesn't close the menu.
- 2026-09-15 — Design gate approved by the product owner; spec reconcile found no changes.
- 2026-09-15 — Pencil: added a Tema segmented control (Sistema selected / Claro / Oscuro, Material Symbols Sharp desktop_windows/light_mode/dark_mode) to `Dashboard/Account Menu` between Negocios and Cerrar sesión, styled like the Activas/Archivadas status tabs. The first screenshot after Insert rendered stale; a re-screenshot in a fresh call was correct.
- 2026-09-15 — Pencil: rebound 236 raw-hex fills/strokes on 13 dashboard screens to `$--background/--foreground/--muted-foreground/--secondary/--destructive` (selected day-chip text → `--background`). Kept as-is: login Brand Panel (#18181B/#FFF/#B8B9B6, dark in both modes), the delete scrim #00000066, the destructive-outline stroke #D93C154D, and shadows. Components were already variable-based. Verified Light unchanged and Dark correct on screen-dashboard, add-screen, login, workspace-settings, the delete dialog and the dashboard component board. All screens left on `Mode: Light`.
- 2026-09-15 — Scope: owner dashboard only (player and website are already dark by design).
- 2026-09-15 — Worktree `.claude/worktrees/dark-mode` on `feat/dark-mode`, branched from feat/ppd-nav-favicon HEAD (95fc954) so it includes workspace settings. Code and OpenSpec live here. Per the product owner, Pencil work happens in the main checkout's `design/pencil.pen`, which has uncommitted ad-v2 work, so the .pen files never diverge.
- 2026-09-15 — Pencil already has theme axis `Mode: [Light, Dark]` with Dark values for all Lunaris `--*` tokens. "Easy to switch" = set `theme: {Mode}` on a frame; the blocker is raw hex on dashboard frames.
- 2026-09-15 — Checkpoint created.

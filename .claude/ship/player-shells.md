# Ship checkpoint — player-shells

Started: 2026-09-23
Current stage: 3/4 — Build done except device-dependent work; Test partly run (e2e blocked on busy dev ports)

**Scope:** Native shells that turn real hardware into Proyecta screens: a Kotlin WebView app for Android, and
Linux/Windows kiosks made of the browser plus a separate Go `proyecta-helper` process, shipped as one installer per
platform. The player plays offline from a cold boot (local rotation and media cache), reports health figures whose
meaning is exact, gets figures from the shell bridge or helper, and has a legacy build so it runs on older WebViews.
The dashboard explains why a figure is missing.

**Detected surfaces:** OpenSpec: yes · Pencil: yes (edit the main checkout's `design/pencil.pen`) · Storybook: no ·
E2E: yes (Playwright, `e2e/`)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | |
| 1 | Design (Pencil) | done | `player-unsupported` (PP793) approved ("continue") |
| 2 | Spec reconcile | done | No behavior change from design. Later: RAM guard simplified to "no shellVersion" (spec + D8), D10 became a static page |
| 3 | Build | in-progress | All code done. Open: device spike (1.1–1.3), real-device/VM checks (6.7, 7.5, 7.6) |
| 4 | Test | done | CI on PR #55: lint, typecheck, unit (TS, Go, Kotlin), 27 integration and 28 e2e tests pass |
| 5 | Sync | pending | |
| 6 | Archive | pending | |

Status values: `pending` · `in-progress` · `done` · `skipped` (with reason).

## Decision log

Newest first. One line per meaningful decision or stage transition.

- 2026-09-23 — Scope added: proyecta.do/download page (Pencil web-download frames, approved without the install-steps section and the changelog link), downloads store at api.proyecta.do/downloads (droplet folder mounted in the proxy), shells.yml publishes installers + latest.json. PR #55 opened with two commits.
- 2026-09-23 — Emulator try-out showed a black slot: the WebView upgraded `http://10.0.2.2` media on the https asset origin and blocked it. Media now always downloads first and plays from local blob URLs (D7 updated), which also stops mid-session network loss from blacking out slots.
- 2026-09-23 — nfpm needed `type: tree` for the player's dist/ (it had flattened assets/) and a staged helper path (no variable expansion in `contents`).
- 2026-09-23 — AndroidX core 1.19 / webkit 1.17 need compileSdk 37 (not installed); pinned core-ktx 1.16.0, webkit 1.14.0, compileSdk 36, targetSdk 35.
- 2026-09-23 — `golang.org/x/sys` pinned to v0.38.0 so the helper builds with Go 1.25.
- 2026-09-23 — D10 changed: the unsupported screen is `packages/player/unsupported.html` (old-engine-safe static page) instead of a native layout; native TextView only when no WebView exists.
- 2026-09-23 — RAM guard keyed on `shellVersion` alone (browsers never send it), no device lookup; spec and design updated.
- 2026-09-23 — Found: the player cached no media or rotation. Added Cache Storage media cache + stored state (D7).
- 2026-09-23 — Stage 1: drafted `player-unsupported` (PP793) as a copy of `player-pairing`, with a version box and an info-icon help row. Approved.
- 2026-09-23 — Proposal approved in plan mode: Kotlin (not Flutter), legacy build with the floor set by the device spike, Go kiosk helper, one installer per platform.
- 2026-09-23 — Checkpoint created; framing done.

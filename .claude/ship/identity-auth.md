# Ship checkpoint — identity-auth

Started: 2026-09-14
Current stage: 6 — Archive (done)

**Scope:** Fonoster Identity runs locally next to Postgres; the API verifies Identity access tokens, resolves the
active workspace, and exposes auth, profile and workspace-membership routers (sign up, sign in, refresh, reset,
invites, members). No UI in this change (owner-dashboard builds it).

**Detected surfaces:** OpenSpec: yes · Pencil: yes · Storybook: no · E2E: yes (Playwright)

| # | Stage | Status | Notes |
| :- | :--- | :--- | :--- |
| 0 | Frame | done | |
| 1 | Design (Pencil) | skipped | Backend-only change; auth/team screens are designed in owner-dashboard |
| 2 | Spec reconcile | done | No design changes to reconcile |
| 3 | Build | done | auth/profile/workspaces routers, guards, jose verifier, compose stack |
| 4 | Test | done | 29 API unit + 10 integration (Identity + Mailpit) green; lint/typecheck green |
| 5 | Sync | done | owner-auth and workspace-membership synced as new main specs (openspec/specs/); `openspec validate --strict` clean |
| 6 | Archive | done | Moved to openspec/changes/archive/2026-09-15-identity-auth |

## Decision log

- 2026-09-14 — Identity encryptionKey must be cloak format (k1.aesgcm256.<base64>); setup script fixed.
- 2026-09-14 — Router inputs parsed with validate(schema) (Zod-esque parser throwing ValidationError) for typed clients + Spanish field errors.
- 2026-09-14 — Change password verifies the current password via exchangeCredentials (Identity UpdateUser doesn't).

- 2026-09-14 — Host ports 50052 (identity gRPC), 9111 (invite bridge), 1026/8026 (Mailpit): qcobro's stack holds the defaults.
- 2026-09-14 — Verify access tokens with jose (iss/aud/tokenUse) instead of identity-client's signature-only verifyToken.
- 2026-09-14 — Checkpoint created; user asked to keep shipping until needed (gates batched).
- 2026-09-15 — Re-verified green on current main (db:generate, eslint, typecheck, full `npm test`) before sync. Synced delta specs into new main specs `openspec/specs/owner-auth/spec.md` and `openspec/specs/workspace-membership/spec.md` (both brand-new capabilities, ADDED requirements only). `openspec validate --strict` clean for the change and both specs. Archived to `openspec/changes/archive/2026-09-15-identity-auth`.

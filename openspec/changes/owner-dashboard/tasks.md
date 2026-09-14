## 1. Pencil design (human-gated)

- [ ] 1.1 Inventory repeated blocks across dashboard frames and create reusable components in a `dashboard: components` frame; verify every repeated block in existing screens is an instance
- [ ] 1.2 Update copy to Dominican Republic (cities, RD$, no Colombian references) and 8-character code input; verify by text scan of dashboard frames
- [ ] 1.3 Design new frames: sign up, forgot/reset password, invitation accepted/failed, team + invite dialog, unlink/archive/delete dialogs, archived list, account menu/workspace switcher; verify screenshots reviewed with the user

## 2. App foundation

- [ ] 2.1 Tailwind theme from Pencil tokens, self-hosted fonts, router, session module, tRPC client with auth/workspace headers and refresh-retry; verify unit tests for the session module and refresh link
- [ ] 2.2 Components mirroring Pencil (shell, page header, stat card, status badge, screen row, form section, day picker, device panel, member row, empty state, dialogs, auth card); verify they render in a components preview route

## 3. Pages

- [ ] 3.1 Auth pages (sign in, sign up, forgot, reset, invitation); verify Playwright: sign up → lands on onboarding
- [ ] 3.2 Onboarding + screens overview (live status, archived filter, empty state); verify Playwright: pair the demo player by its code → status En línea
- [ ] 3.3 Add/edit screen and screen detail with link/unlink/archive/delete dialogs; verify Playwright: unlink → player shows code; archive → appears under Archivadas
- [ ] 3.4 Team page (invite, resend, remove) and profile; verify Playwright: invite → Mailpit has the email → accept link → member Activo

## 4. Verification

- [ ] 4.1 Screenshot key pages at 1440×900 and compare with Pencil; lint, typecheck, unit and e2e green

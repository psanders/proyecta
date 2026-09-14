## Why

Owners need the dashboard designed in Pencil to create an account, invite their team, publish screens, pair
players and see them on air. The design exists for the core screens but not for team management, account
recovery or the unlink/archive/delete flows, and its repeated blocks aren't reusable components yet.

## What Changes

- Pencil: extract reusable components for every repeated dashboard block (app shell/sidebar, page header, stat
  card, screen row, status badge, form section, day picker, device status panel, member row, empty state, confirm
  dialog, auth card) and rebuild the existing screens from them; fix copy to Dominican Republic (Santo Domingo,
  Santiago, RD$); design the missing screens: sign up, forgot/reset password, accept invitation (ok/failed), team,
  invite member dialog, unlink/archive/delete dialogs, archived screens, account menu / workspace switcher.
- Dashboard app (React + Tailwind using the Pencil tokens and fonts): all of the above wired to the `identity-auth`
  and `device-protocol` APIs, with live screen status.
- Non-goals: advertiser screens, billing, analytics/proof of play views, mobile-first layouts (desktop ≥ 1280 px,
  usable at 1024 px).

## Capabilities

### New Capabilities
- `owner-dashboard`: the owner-facing web experience: auth pages, onboarding, screens, pairing, lifecycle actions,
  team management.

### Modified Capabilities
<!-- none -->

## Impact

- `design/pencil.pen`: new component frame + new/updated screens.
- `packages/dashboard`: routes, session handling, tRPC client with auth headers/refresh, UI components mirroring Pencil.
- Depends on `identity-auth` and `device-protocol`.

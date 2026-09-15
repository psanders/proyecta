## Why

Owners check the dashboard at night and in dim rooms next to their screens, and the rest of Proyecta (player, website)
is already dark. The Lunaris tokens in Pencil already carry a Dark value for every color, but the dashboard only ships
the Light values and some Pencil screens use raw hex colors, so a screen can't simply be flipped to dark.

## What Changes

- The dashboard gets an **Apariencia** preference on the Mi perfil page: **Sistema** (default, follows the operating system),
  **Claro** and **Oscuro**. The choice applies immediately, is remembered in that browser, and is applied before the
  first paint (no light flash on load).
- Dashboard colors come from the Pencil `Mode` theme axis: Light values as today, Dark values for dark mode.
- **Pencil**: every dashboard screen and `Dashboard/*` component uses `$--` variables instead of raw hex, so switching
  a frame's `Mode` theme between Light and Dark in Pencil renders the correct dark design.
- Non-goals: syncing the preference across devices or accounts, dark/light variants of the player or the marketing
  site, a design pass beyond mapping existing tokens.

## Capabilities

### New Capabilities
- `dashboard-appearance`: the theme preference (Sistema/Claro/Oscuro), how it is applied and remembered.

### Modified Capabilities
<!-- owner-dashboard (not yet synced) gains an Apariencia section on Mi perfil; captured in dashboard-appearance to
     avoid a MODIFIED delta against an unsynced spec. -->

## Impact

- `packages/dashboard`: dark token values, theme preference hook, pre-paint script in `index.html`, Apariencia section
  on Mi perfil.
- `design/pencil.pen`: dashboard screens and `Dashboard/*` components rebound to `$--` variables; new `profile` frame
  (Datos personales, Contraseña, Apariencia).
- No API, database or `/device/v1` changes.

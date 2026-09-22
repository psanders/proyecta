## Why

Owners need one place to manage their business (name, time zone) and, when they stop operating, to close it. The
side menu is also getting crowded with account items: Equipo and Mi perfil belong to the account menu, like in QCobro,
leaving the vertical navigation for the business itself.

## What Changes

- New **Configuración** page for the active business: business name, currency (US$, fixed by pay-per-display) and time
  zone, saved together. Members can view it; admins and owners can edit.
- Owner-only **Eliminar negocio** with type-to-confirm ("ELIMINAR"). Allowed only when no player is linked to any of
  its screens; its screens are soft-deleted and play logs are kept.
- A business's **time zone** defines the "Hoy" and "Últimos 7 días" windows of the pay-per-display earnings summary
  (default America/Santo_Domingo).
- **Navigation**: the vertical menu shows Pantallas and Configuración; Equipo and Mi perfil move to the account menu at
  the bottom, together with the business switcher and Cerrar sesión. The business name field moves from Mi perfil to
  Configuración.
- If a signed-in owner has no business (e.g. after deleting their only one), the dashboard asks them to create one.
- Non-goals: billing settings, per-business currency, logo/branding, transferring ownership.

## Capabilities

### New Capabilities
- `workspace-settings`: business preferences (name, time zone, currency display), deletion rules, and creating a
  business when the owner has none.
- `owner-dashboard-navigation`: what the vertical menu and the account menu contain.

### Modified Capabilities
<!-- The earnings time-window rule refines pay-per-display's accounting spec (not yet synced); captured as a
     requirement in workspace-settings to avoid a MODIFIED delta against a spec that doesn't exist yet. -->

## Impact

- `packages/api`: `WorkspaceSettings` model (time zone per workspace), `workspaces.settings`, `workspaces.updateSettings`,
  `workspaces.delete`, `workspaces.create`; earnings windows use the workspace time zone.
- `packages/common`: time zone list and settings schemas.
- `packages/dashboard`: Configuración route, account menu, create-business page; Mi perfil loses the business card.
- `design/pencil.pen`: nav components, account menu, Configuración and delete dialog frames.
- Depends on identity-auth (Identity DeleteWorkspace/CreateWorkspace) and pay-per-display (earnings).

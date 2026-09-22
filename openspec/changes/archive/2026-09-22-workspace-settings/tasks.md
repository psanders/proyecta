## 1. Design (Pencil)

- [x] 1.1 Update `Dashboard/Nav/Expanded` and `Dashboard/Nav/Collapsed` items to Pantallas + Configuración; add `Dashboard/Account Menu` (header, Mi perfil, Equipo, businesses, Cerrar sesión); verify with screenshots
- [x] 1.2 Design `workspace-settings` (preferences card + owner danger card) and `workspace-settings-delete-dialog`; verify with screenshots

## 2. API

- [x] 2.1 Prisma `WorkspaceSettings` + migration; common time zone list and settings/create/delete schemas; verify migration applies and schema tests pass
- [x] 2.2 `workspaces.settings`, `updateSettings` (admin), `delete` (owner, refuses linked players, soft-deletes screens), `create` (refreshes session); verify unit tests incl. forbidden and linked-player cases
- [x] 2.3 Earnings windows use the workspace time zone with DST-safe local midnights; verify unit tests for America/New_York

## 3. Dashboard

- [x] 3.1 Vertical menu (Pantallas, Configuración) + account menu (Mi perfil, Equipo, businesses, Cerrar sesión); verify Playwright
- [x] 3.2 Configuración page (preferences + owner-only delete with type-to-confirm); remove business card from Mi perfil; create-business page when none; verify Playwright: change time zone, delete a business → create-business step

## 4. Verification

- [x] 4.1 Lint, typecheck, unit, integration and e2e green

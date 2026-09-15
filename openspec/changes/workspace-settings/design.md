## Context

Workspaces live in Fonoster Identity (name, owner, members). Proyecta owns resources keyed by the workspace
`accessKeyId`. Earnings windows are currently hard-coded to UTC-4. QCobro's settings page (name + currency + time zone,
owner-only type-to-confirm delete) is the reference UX.

## Decisions

- **Settings storage**: `WorkspaceSettings(workspaceAccessKeyId PK, timezone, createdAt, updatedAt)` in Proyecta's
  database, created lazily with defaults; the name stays in Identity (`updateWorkspace`). Currency is not stored: US$
  is a pay-per-display invariant, shown for clarity.
- **Time zones**: a curated list (America/Santo_Domingo first, then Caribbean/US/LatAm zones) in `@proyecta/common`.
  Local-midnight instants are computed with `Intl.DateTimeFormat` offsets (no library), so DST zones work.
- **Delete** (`ownerProcedure`): check no open `DeviceBinding` on the workspace's screens → soft-delete screens →
  `identity.deleteWorkspace`. If Identity fails after screens were soft-deleted, the error surfaces and the owner can
  retry; screens being hidden is harmless.
- **Create** (`protectedProcedure`): `identity.createWorkspace`, then refresh the session so the token's `access`
  claim includes it (same as sign up).
- **Navigation**: vertical items move to Pantallas + Configuración; the account popover gains a header (initials, name,
  email) and Mi perfil / Equipo items above the business switcher. Pencil components `Dashboard/Nav/*` are updated and a
  `Dashboard/Account Menu` component is added.

## Risks / Trade-offs

- [Deleting a business is irreversible in Identity] → owner-only, type-to-confirm, refused while players are linked.
- [Members of a deleted business keep a stale token until refresh] → every workspace procedure re-checks membership on
  the next token refresh; Identity rejects calls to the deleted workspace.

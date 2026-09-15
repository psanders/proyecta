## Why

Screen owners need accounts before they can pair devices or see screens, and a business
usually has more than one person operating its screens. Fonoster Identity already provides
users, workspaces, roles, invites, RS256 tokens and password reset, and it's proven in
qcobro. Reusing it avoids building authentication from scratch.

## What Changes

- Run Fonoster Identity (Docker image `fonoster/identity`) next to Postgres in `compose.yaml`,
  with its own `identity` database, generated RSA signing keys, and Mailpit to catch email in dev.
- API: verify Identity access tokens on every tRPC request, resolve the active workspace from
  an `x-workspace` header, and add procedure guards (authenticated, workspace member, admin, owner).
- API: tRPC `auth` router (sign up, sign in, refresh, request/complete password reset),
  `profile` router (get, update name, change password), and `workspaces` router (list, rename,
  members list, invite, resend invite, remove member, accept invitation).
- Sign up creates the user, signs them in, and creates their first workspace (the business name).
- Spanish (es-DO), Proyecta-branded email templates for invites and password reset.
- Non-goals: MFA, OAuth (GitHub), contact verification, API keys, billing, workspace deletion UI.

## Capabilities

### New Capabilities
- `owner-auth`: owner accounts — sign up, sign in, session refresh, password reset, profile.
- `workspace-membership`: businesses as workspaces — roles, invites, acceptance, removal, and the
  authorization rules every other dashboard capability relies on.

### Modified Capabilities
<!-- none: no main specs exist yet -->

## Impact

- `compose.yaml`, new `config/identity/` (config example, templates; keys and real config gitignored),
  `docker/postgres-init.sql` (identity database), `scripts/setup-identity.sh`.
- `packages/api`: `@fonoster/identity-client`, `@grpc/grpc-js` dependencies; tRPC context, guards, routers.
- `packages/common`: auth, profile and membership Zod schemas.
- Every later dashboard change (device-protocol screens, owner-dashboard) builds on these guards.

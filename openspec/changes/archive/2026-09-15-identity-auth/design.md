## Context

The API is Express + tRPC (dashboard) + Prisma/Postgres (see proposal.md). Fonoster Identity is a
separate gRPC service with its own database, configured by a mounted JSON file; qcobro already runs
it this way (`fonoster/identity`, `@fonoster/identity-client`), so the integration pattern is known.

## Goals / Non-Goals

**Goals:** a working local stack with one command; Identity as the single source of truth for users,
workspaces and membership; Proyecta owns nothing about passwords or tokens.

**Non-Goals:** MFA, OAuth, contact verification, API keys (device auth is a separate token issued by
the device protocol), production deployment.

## Decisions

- **Identity as a container, pinned** (`fonoster/identity:0.25.2`) in `compose.yaml`, sharing the Postgres
  instance but using its own `identity` database (created by `docker/postgres-init.sql`). Alternative:
  embedding `@fonoster/identity` in the API process — rejected: it pins Prisma 6 and gRPC deps into our
  Prisma 7 app and couples deploys.
- **Config and keys generated locally** by `scripts/setup-identity.sh`: RSA 2048 keys + `identity.json`
  from `config/identity/identity.example.json` with a random `encryptionKey`. Both are gitignored; only the
  example and templates are committed.
- **Mail in dev via Mailpit** (SMTP :1025, UI :8025) so invites and resets are testable end to end.
- **Client**: `@fonoster/identity-client` (gRPC) for all Identity calls, created once and injected into the
  tRPC context. gRPC errors map to typed `TRPCError`s (`INVALID_ARGUMENT`→`BAD_REQUEST`,
  `UNAUTHENTICATED`/`PERMISSION_DENIED`→`UNAUTHORIZED`/`FORBIDDEN`, `ALREADY_EXISTS`→`CONFLICT`, …).
- **Token verification in Proyecta, stricter than the client's `verifyToken`**: fetch the public key once via
  `GetPublicKey`, then verify with `jose` (RS256, `issuer`, `audience`, `exp`) and require
  `tokenUse === "access"`. The stock `verifyToken` checks only the signature, so a refresh token would pass.
- **Guards mirror qcobro**: `publicProcedure`, `protectedProcedure` (valid token), `workspaceProcedure`
  (member of `x-workspace`, role from the token's `access` claim), `adminProcedure`, `ownerProcedure`.
  Roles come from the token, so a role change applies at the next refresh (≤ 15 min).
- **Sign up is orchestrated by the API** (createUser → exchangeCredentials → createWorkspace), in a
  validated function with the Identity client injected. If workspace creation fails after the user exists,
  the error is surfaced; signing in later with no workspace shows a "create your business" step (dashboard).
- **Invite acceptance** goes through the API (`workspaces.acceptInvitation`), which forwards the token to
  Identity's HTTP bridge and reads the redirect target to tell success from failure (same as qcobro).
- **Branded templates**: Spanish `.hbs` files bind-mounted over Identity's stock templates.
- **Dashboard session**: access + refresh token and active workspace in `localStorage`; the tRPC link
  refreshes once on `UNAUTHORIZED` and retries, otherwise signs out.

## Risks / Trade-offs

- [Tokens in localStorage are readable by injected scripts] → strict CSP on the dashboard, no third-party
  scripts, short (15 min) access tokens. Revisit HttpOnly cookies before production.
- [Role changes lag until token refresh] → acceptable for v0; admin actions are re-checked by Identity.
- [Template bind-mount paths depend on the image layout] → pinned image version; smoke test sends a real
  invite to Mailpit.
- [Identity image is large (~2 GB)] → dev only concern; already cached on this machine.

## Migration Plan

New stack; nothing to migrate. `npm run db:up` becomes `docker compose up -d` for postgres + identity +
mailpit after `scripts/setup-identity.sh`.

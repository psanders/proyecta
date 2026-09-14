## 1. Local Identity stack

- [x] 1.1 Add `identity` database creation to `docker/postgres-init.sql` and a one-off create for existing volumes; verify `psql -l` lists `identity`
- [x] 1.2 Add `config/identity/identity.example.json`, Spanish templates, and `scripts/setup-identity.sh` (keys + config, gitignored); verify the script is idempotent
- [x] 1.3 Add `identity` (pinned) and `mailpit` services to `compose.yaml`; verify `docker compose up -d` reports identity healthy on :50051 and Mailpit UI on :8025

## 2. Contracts

- [x] 2.1 Add Zod schemas to `@proyecta/common` for sign up, sign in, refresh, reset request/complete, profile update, invite, remove, resend, accept invitation, with Spanish messages; verify schema unit tests (valid + invalid)

## 3. API auth core

- [x] 3.1 Add `@fonoster/identity-client`; create the client from config and map gRPC errors to TRPCErrors; verify unit tests for the error mapping
- [x] 3.2 Implement access-token verification (jose, issuer/audience/tokenUse) with an injected public-key loader; verify unit tests reject refresh tokens, wrong audience and expired tokens
- [x] 3.3 Build the tRPC context (bearer token + `x-workspace`) and the public/protected/workspace/admin/owner guards; verify guard unit tests

## 4. Routers

- [x] 4.1 `createSignUp` validated function (createUser → exchangeCredentials → createWorkspace) and `auth` router (signUp, signIn, refresh, requestPasswordReset, resetPassword); verify unit tests incl. validation failure
- [x] 4.2 `profile` router (get, updateName, changePassword); verify unit tests
- [x] 4.3 `workspaces` router (list, rename, members, invite, resend, remove, acceptInvitation) with owner-removal protection; verify unit tests incl. forbidden cases

## 5. Verification

- [x] 5.1 Integration test against the running stack: sign up → sign in → invite → Mailpit receives the Spanish invite → accept → member active → remove; verify it passes with `npm run test:integration`
- [x] 5.2 Lint, typecheck, unit tests green; update README/CLAUDE.md setup steps

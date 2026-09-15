# Pending deploy steps

Manual steps on the production droplet that the **next release** needs, added by the PR that
introduces them. The deploy workflow never touches hand-managed files (`.env`,
`config/identity/identity.json`, keys), so anything there goes here.

Before merging the `chore(release)` PR: do each step on the droplet (`/opt/proyecta`), then delete
it from this file in the release PR.

<!-- Add steps as: - [ ] **<PR #>** what to change, and why. -->

- [ ] **proyecta-config** The apiserver reads `config/proyecta.json` instead of environment
      variables and won't start without it. Create `/opt/proyecta/config/proyecta.json` from
      `config/proyecta.example.json` with the real Postgres password in `database.url`,
      then `chmod 644 config/proyecta.json`. Afterwards `IDENTITY_ISSUER` and `IDENTITY_AUDIENCE`
      can be removed from `.env`.

- [ ] **#16** Dashboard routes are now English. In `config/identity/identity.json` set `appUrl` to
      `https://app.proyecta.do/sign-in`, `invite.url` to `https://app.proyecta.do/invitation` and
      `invite.failUrl` to `https://app.proyecta.do/invitation-invalid`, then
      `docker compose restart identity`. Otherwise invite emails link to a page that no longer exists.

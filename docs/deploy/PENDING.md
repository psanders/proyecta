# Pending deploy steps

Manual steps on the production droplet that the **next release** needs, added by the PR that
introduces them. The deploy workflow never touches hand-managed files (`.env`,
`config/identity/identity.json`, keys), so anything there goes here.

Before merging the `chore(release)` PR: do each step on the droplet (`/opt/proyecta`), then delete
it from this file in the release PR.

<!-- Add steps as: - [ ] **<PR #>** what to change, and why. -->

- [ ] **#16** Dashboard routes are now English. In `config/identity/identity.json` set `appUrl` to
      `https://app.proyecta.do/sign-in`, `invite.url` to `https://app.proyecta.do/invitation` and
      `invite.failUrl` to `https://app.proyecta.do/invitation-invalid`, then
      `docker compose restart identity`. Otherwise invite emails link to a page that no longer exists.

- [ ] **deploy-env-cleanup** Once a release with this change is deployed, remove `TLS_DOMAIN` and
      `TLS_EXTRA_DOMAINS` from `/opt/proyecta/.env`: `tls.sh` now derives them from `APP_HOST`,
      `PLAY_HOST` and `API_HOST`. Not before: the running release's `tls.sh` still needs them.

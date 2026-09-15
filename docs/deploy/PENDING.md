# Pending deploy steps

Manual steps on the production droplet that the **next release** needs, added by the PR that
introduces them. The deploy workflow never touches hand-managed files (`.env`,
`config/identity/identity.json`, keys), so anything there goes here.

Before merging the `chore(release)` PR: do each step on the droplet (`/opt/proyecta`), then delete
it from this file in the release PR.

<!-- Add steps as: - [ ] **<PR #>** what to change, and why. -->

_None._

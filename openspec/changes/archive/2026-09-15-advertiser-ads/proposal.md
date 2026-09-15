## Why

The marketing site promises advertisers "Elige pantallas, sube tu anuncio, míralo al aire" and valleros "Tú decides qué
campañas se reproducen en tu espacio", but the platform has no advertiser side: every linked screen plays one global
demo rotation, and there is no way to upload a file, pick screens or see where an ad plays. One business (workspace)
can own screens and advertise at the same time, so this also has to decide how the dashboard stays simple for
one-sided businesses and how a business is billed when it plays its own ads. This change deliberately goes beyond the
original v0 scope (player-first) at the product owner's request.

## What Changes

- **Dashboard view per business**: a business setting — Publicar pantallas / Anunciar / Ambos — asked when a business
  is created (sign-up onboarding and create-business) and editable by admins in Configuración. It only changes which
  sections the vertical menu shows and where home lands; it never restricts access or billing. "Ambos" shows two
  labeled groups (Pantallas, Anuncios). Switching away from a side with active things asks for confirmation.
- **Assets (Recursos)**: advertisers upload videos (MP4, WebM, MOV) and images (JPG, PNG, WebP). Automated checks
  (format, size, minimum resolution, video length a 5-second multiple between 5 and 60 s) run on upload; images get a
  chosen duration of 5, 10 or 15 s. Player renditions are produced in the background. Assets are immutable.
- **Ads (Anuncios)**: create an ad from one asset, a set of screens and a start/end date (a 4-step flow); see all ads
  with a derived status (Esperando aprobación, Programado, Al aire, Finalizado, Cancelado); open an ad to see each
  screen's status, plays and spend; add or remove screens, replace the file (the previous file keeps playing where it
  was approved until the new one is), and cancel.
- **Buscar pantallas**: a read-only catalog of complete, active screens from every business, filterable by city and
  place type and showing the rate, with a shortcut to advertise on a screen.
- **Placements and the approval guardrail**: every (ad, screen, file) is a placement with a status. Placements on the
  advertiser's own screens start approved; placements on other businesses' screens stay pending and never play. Owner
  review (approve, reject, revoke) is the next change, `ad-review`.
- **Per-screen rotation**: a linked screen with approved ads inside their dates plays those ads; a screen with none
  keeps the default rotation. Devices get `rotation.updated` when a screen's ads change or an ad's dates start or end.
  Additive to `/device/v1` (same shapes, content chosen per screen).
- **House plays and separate ledgers**: a play of an ad on its advertiser's own screen is logged but not billable and
  is shown as "propias (sin costo)"; earnings (by screen business) and ad spend (by advertiser business) are computed
  separately from play logs and never netted.

## Non-goals

- Owner review of other businesses' ads (requests inbox, approve with per-screen opt-out, reject reasons, revoke,
  "Sin respuesta", approval emails) — `ad-review`.
- Charging advertisers, invoices, payouts, comprobantes fiscales, or netting earnings against spend.
- Capacity, share of voice, scheduling by daypart or loop slots; approval does not reserve airtime.
- A calendar view, drafts, multiple files per ad (e.g. per orientation), AI or staff content moderation.
- The "hidden side needs attention" banner (nothing needs owner action until `ad-review`).

## Capabilities

### New Capabilities
- `workspace-view`: the per-business dashboard view (owner, advertiser, both), when it's asked, who can change it, the
  menu layouts, the switch confirmation, and that it never affects access or billing.
- `advertiser-assets`: uploading files, automated checks, background renditions, immutability and the Recursos library.
- `ads`: creating ads, the screen catalog and compatibility filter, placements and their initial status, derived ad
  and per-screen status, adding/removing screens, replacing the file, cancelling, and per-ad plays and spend.

### Modified Capabilities
- `device-sync`: "Current state" and "Live events" — the rotation is chosen per screen from its approved, in-date ads
  (falling back to the default rotation), and `rotation.updated` fires when that set changes.
- `accounting`: "Billable plays" and "Screen earnings summary" — plays are attributed to the ad's advertiser, house
  plays are not billable and are counted separately, and advertiser spend is a separate ledger.

## Impact

- `packages/api/prisma/schema.prisma` + migration: `WorkspaceSettings.dashboardView`; new `Asset`, `Ad`, `AdPlacement`;
  `PlayLog` gains `placementId`, `advertiserWorkspaceAccessKeyId`, `house`.
- `packages/common/src/schemas`: workspace settings (view), new asset and ad schemas, accounting (house plays, spend);
  API message catalog entries in Spanish and English.
- `packages/api`: asset upload HTTP endpoint (raw body, authenticated like tRPC) and background renditions via ffmpeg
  (`scripts/transcode.sh` settings); new `assets` and `ads` validated functions and tRPC routers; per-screen rotation in
  `buildDeviceState`; a schedule sweeper for ad start/end; attribution in `createRecordPlayLogs`; earnings changes.
- `packages/dashboard`: grouped sidebar and home redirect, view choice in onboarding / create business / settings,
  Recursos, Anuncios (list, new, detail), Buscar pantallas, "propias" line on screen detail. English routes for the new
  pages (`/assets`, `/ads`, `/ads/new`, `/ads/:id`, `/explore`).
- Infra: the API image needs `ffmpeg`; uploaded content lives in a new `CONTENT_DIR` (served at `/content`) that
  deployments mount as a volume.
- `design/pencil.pen`: advertiser frames reworked to DR/US$ plus new onboarding, settings and navigation states.
- Depends on `device-protocol`, `pay-per-display` (synced) and `workspace-settings` / `owner-dashboard` (built, not yet
  archived). Followed by `ad-review`.

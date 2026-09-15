## Why

`advertiser-ads` lets a business put an ad on another business's screen, but that placement stays "Esperando
aprobación" forever: nobody can approve it, so the marketplace only works on a business's own screens. The site promises
valleros "Tú decides qué campañas se reproducen en tu espacio", and advertisers need to know whether each owner said yes,
no or nothing. This change gives owners the decision and advertisers the answer.

## What Changes

- **Solicitudes (owner inbox)**: one request per ad on the owner's screens from another business, listing the ad's
  file, advertiser, dates and the owner's screens in it. Pendientes and Revisadas tabs; a live pending count in the menu.
- **Review a request**: preview the file, then approve on the checked screens (unchecked ones are declined as "No es
  apto para este lugar") or reject all with a reason (contenido inapropiado, competencia, no apto para el lugar, baja
  calidad, otro + note). Approved placements start playing within their dates; the advertiser sees the reason for
  rejections.
- **Approval reuse**: a placement for a file an owner already approved on that same screen starts approved (a new ad
  with the same file, or re-adding a removed screen), so owners aren't asked twice for the same thing.
- **Stop an ad (revoke)**: from a screen's detail ("Anuncios en esta pantalla") or from the reviewed request, an owner
  stops an approved ad on a screen; it leaves that player's rotation at once and past plays stay billed.
- **Sin respuesta**: a pending placement whose ad has ended shows as "Sin respuesta" to both sides and never plays.
- **Advertiser statuses**: screens can now also be Rechazado (with the reason and note), Detenido por el vallero or Sin
  respuesta, and an ad with nothing on air, scheduled or pending but some of those shows "Requiere atención".
- **Hidden-side banner**: a business whose dashboard view hides Pantallas sees a banner when it has pending requests.
- Removing a screen or replacing a file only withdraws placements that are still pending or approved, so owners'
  decisions stay on record.
- In-app only: no emails (a later change).

## Non-goals

- Email or WhatsApp notifications, reminders before an ad starts, response-rate signals.
- Category or advertiser block/allow lists, auto-approval, AI or staff moderation.
- Undoing a rejection (the advertiser replaces the file or adds the screen again), per-slot capacity, invoicing.

## Capabilities

### New Capabilities
- `ad-review`: the owner's requests inbox and pending count, approving with per-screen opt-out, rejecting with reasons,
  approval reuse, revoking, "Sin respuesta", and who can do what.

### Modified Capabilities
- `ads`: "Placements and the approval guardrail" (owners decide; reuse), "Ad and screen status" (Rechazado, Detenido por
  el vallero, Sin respuesta, Requiere atención, reasons), "Change an ad's screens" (decisions stay on record).
- `device-sync`: "Live events" — approvals and revocations push rotation updates.
- `workspace-view`: "Menu follows the view" (Solicitudes with a count) and a banner when a hidden side has pending
  requests.

## Impact

- `packages/api/prisma/schema.prisma` + migration: `AdPlacement.reasonCode` (enum), `note`, `decidedByUserRef`.
- `packages/common`: review schemas and views, rejection reasons, updated `adScreenStatus`/`adStatus`, API messages.
- `packages/api`: `src/api/adReview/*` validated functions (list requests, get request, approve, reject, revoke,
  pending count, screen ads), reuse in the ad functions, `adReview` tRPC router, rotation notifications.
- `packages/dashboard`: Solicitudes nav item + count, `/requests` and `/requests/:adId`, reject and revoke dialogs,
  screen-detail "Anuncios en esta pantalla" card, advertiser badges and reasons, hidden-side banner.
- `design/pencil.pen`: `owner-requests`, `owner-request-review`, `owner-reject-dialog`, `owner-revoke-dialog`,
  mixed-status `advertiser-ad-detail`, nav with Solicitudes.
- Depends on `advertiser-ads` (archived; specs synced in #26).

# Plan: dashboard view (what the dashboard shows) and billing for businesses on both sides

> Research and planning notes, not a spec (2026-09-15). This seeds `/opsx:propose advertiser-ads`. The business
> setting is named `dashboardView` / `workspace-view` because `trpc.profile` already means the user's personal
> profile. `device-protocol` and `pay-per-display` are synced into `openspec/specs/`; dashboard copy goes through i18n
> keys.

## Context

One business (an Identity workspace) can own screens **and** advertise at the same time; the two roles don't
conflict. Two problems follow:

1. **Clutter.** Today's sidebar (`packages/dashboard/src/components/AppSidebar.tsx`) has two items: Pantallas and
   Configuración. The advertiser side (parked plan below) adds Buscar pantallas, Recursos and Anuncios, and approval
   adds Solicitudes. A vallero who never advertises shouldn't wade through all of that, and neither should an
   advertiser with no screens.
2. **Billing.** Screens carry a pay-per-display rate, and every play snapshots it (`PlayLog.rateCentsAtPlay`,
   `billedUnits`). It isn't defined what happens when a business plays its own ad on its own screen, or when a
   business both earns and spends.

The user's idea is a view setting (Screen Owner / Advertiser / Both) that only changes what the dashboard shows,
with billing handled separately. **Verdict: keep it, with guardrails.** It is presentation only, and billing follows
facts, never the setting.

**Decisions (user, 2026-09-15)**
- **"Both" sidebar**: two labeled groups in one sidebar, not an Airbnb-style mode switch.
- **Who sets it**: it's a business setting, asked when a business is created and editable by admins in
  Configuración. Every member sees the same view.
- **Own ad on own screen**: the play is logged but not billable (a "house play").
- **Earnings vs spend**: kept in separate ledgers that never net out automatically.

## Research

- **[Airbnb](https://www.airbnb.com/help/article/3546)**: one account is both guest and host, with a full mode
  switch ("Switch to hosting"). That works for Airbnb because each mode has a large, separate app. Proyecta's two
  sides are only 2–3 nav items each, so a switch would hide the other side's alerts for no gain. Labeled groups are
  enough.
- **Venue content in DOOH networks**: the venue's own content is typically kept outside third-party billing ([AI
  Digital on signage ad networks](https://www.aidigital.com/blog/digital-signage-advertising-network),
  [digitalsignage.com](https://digitalsignage.com/_html/digital_signage_ad_network.html)). Proyecta's own site
  already shows 2 of 12 loop slots as "Contenido del vallero". House plays match that model.

## Design

### 1. Dashboard view (presentation only)

- **Storage**: `WorkspaceSettings.dashboardView` enum `SCREEN_OWNER | ADVERTISER | BOTH`, read and written through the
  existing `createGetWorkspaceSettings` / `createUpdateWorkspaceSettings` functions.
  - Existing businesses default to `SCREEN_OWNER`, which is today's behavior.
  - UI labels: "Publicar pantallas" / "Anunciar" / "Ambos".
- **Asked at creation**: `CreateBusinessPage` (and sign-up's first business) asks "¿Qué quieres hacer con
  Proyecta?" as three radio cards. Onboarding then branches:
  - Publicar pantallas → the current pairing onboarding
  - Anunciar → Buscar pantallas
  - Ambos → pairing, with a hint about Anuncios
- **Sidebar**:

  | View | Items |
  |---|---|
  | `SCREEN_OWNER` | Pantallas, Solicitudes · Equipo, Configuración (no group headings) |
  | `ADVERTISER` | Buscar pantallas, Recursos, Anuncios · Equipo, Configuración |
  | `BOTH` | **PANTALLAS** group + **ANUNCIOS** group · Equipo, Configuración. The collapsed rail separates the groups with a divider. |

  - The home route follows the view: owner and both → screens, advertiser → ads.
  - Extend the Pencil `Dashboard/Nav/Expanded` and `Dashboard/Nav/Collapsed` components with an optional group
    heading.
- **Guardrails** (the setting is a lens, not a permission):
  - API guards never read `dashboardView`. Every route stays reachable by URL, so a link in an email always works.
  - Hiding a side changes nothing that runs. Screens keep playing, ads keep running and billing continues.
  - Moving away from a side that has active things (linked screens, running ads, pending requests) opens a
    confirmation: "Tus 3 pantallas siguen activas y facturando. Solo cambia lo que ves en el panel."
  - When a hidden side needs action (for example a pending request while in `ADVERTISER`), a one-line banner says
    so, with the action "Mostrar ambos", instead of silently hiding it.
  - Only admins and owners can change the view, the same rule as the rest of Configuración.

### 2. Billing facts

- **Attribution**: when advertiser ads exist, each `PlayLog` snapshots `advertiserWorkspaceAccessKeyId` (plus the
  ad/placement id) at record time, just as it already snapshots the rate. Billing is **by workspace, not by
  person**: one person who belongs to business A (screens) and business B (ads) still pays B → A.
- **House play**: when the advertiser workspace equals the screen's workspace, the play is stored with `house =
  true`, `rateCentsAtPlay = null` and `billedUnits = null`.
  - It still counts for proof of play and in "reproducciones".
  - It never counts toward earnings or spend.
  - Demo and unattributed items stay as they are today.
- **Separate ledgers**, both derived from `PlayLog` and never offset:
  - earnings = billable plays grouped by screen workspace
  - spend = billable plays grouped by advertiser workspace

  Settlement, payouts, invoices and comprobantes fiscales (NCF/ITBIS; confirm with an accountant) belong to a future
  `advertiser-billing` change. An opt-in "usar saldo" netting can come after that.
- **The view never affects billing.** A business set to "Publicar pantallas" with an ad still running is still
  charged for it, and the confirmation dialog on switching says so.
- **Visible in the UI**:
  - Screen detail "Actividad publicitaria": "Hoy · 12 reproducciones · US$ 30.00", with a secondary line "4 propias
    (sin costo)".
  - Advertiser ad detail: own screens are tagged "Propia · sin costo".
- **Known trade-off**: house plays can crowd paid ads out of a loop. Capacity and share of voice are out of scope
  (already a non-goal in the parked plan).

## Where it lands

This folds into the **`advertiser-ads`** change from the parked plan below rather than shipping alone. On its own,
"Anunciar" would lead to an empty dashboard. Additions to that change:

- **Specs**:
  - `workspace-view` (new): the setting, the creation question, the three nav layouts, the guardrails.
  - `workspace-settings` (modified): the view field in Configuración.
  - `owner-dashboard-navigation` (modified): the grouped sidebar.
  - `accounting` (modified): advertiser attribution, house plays excluded from earnings, the separate-ledger
    definition.
- **Pencil**:
  - a `create-business` view question
  - `workspace-settings` with the view field and the switch confirmation dialog
  - the nav in all three views, expanded and collapsed
  - the "propias" line on screen detail
- **Code**:
  - Prisma: `WorkspaceSettings.dashboardView`, `PlayLog.house` and `advertiserWorkspaceAccessKeyId`
  - `packages/common/src/schemas` (`updateWorkspaceSettingsSchema`)
  - `createRecordPlayLogs` in `packages/api/src/api/devices/createDeviceSyncFunctions.ts`
  - `createGetScreenEarnings`
  - `AppSidebar.tsx`
  - `CreateBusinessPage.tsx`, `SettingsPage.tsx`
- **Build order**: the view setting and nav go first inside the change, so the advertiser screens land in a nav
  that's already gated.

## Verification (added to `advertiser-ads`)

- **Scenarios**:
  - new business picks "Anunciar" → the sidebar has no Pantallas group and home is Anuncios
  - a member tries to change the view → forbidden
  - switching from Ambos to Anunciar with linked screens → the confirmation lists them, and afterwards the screens
    still play and still earn
  - a hidden side has a pending request → the banner shows
  - own ad on own screen → the play is logged with `house`, earnings unchanged, "1 propia" shown
  - business B's ad on business A's screen with the same person in both → billable to B, earned by A
  - a business that both earns and spends → the two totals are reported separately and never netted
- **Tests**: unit tests for the house-play branch in `createRecordPlayLogs` and for earnings excluding house plays;
  integration: `dashboardView` round-trip through `workspaceSettings`; e2e: create a business as "Ambos" → grouped sidebar.

---

# Parked: advertiser side first (`advertiser-ads`), then owner approval (`ad-review`)

> **Parked 2026-09-15** at the user's request, to switch to the dashboard-view topic above, which folds into
> `advertiser-ads`.

> **Sequencing update (user, mid-planning):** start with the advertiser side, so this is two changes, not one.
> 1. **`advertiser-ads`**: assets, ads, the screen picker, `AdPlacement` with its full status set, the derived ad
>    status, and the per-screen rotation. The guardrail: only placements on the advertiser's **own** screens start
>    APPROVED. Everything else stays PENDING ("Esperando aprobación") and never plays. This keeps "Tú decides" true
>    and makes the change testable end to end (a business advertising on its own screens).
> 2. **`ad-review`**: the owner requests inbox, approve with opt-out, reject reasons, reuse on the same screen,
>    revoke, "Sin respuesta", emails, and the rejected/revoked actions on the advertiser's ad detail.
>
> The placement model and status set are designed in change 1, so change 2 adds behavior without a data migration
> rewrite. The sections below describe the full end state and are marked with the change each piece belongs to.

## Context

The marketing site already promises valleros "Tú decides qué campañas se reproducen en tu espacio" and promises
advertisers "Elige pantallas, sube tu anuncio, míralo al aire". Nothing in the code backs either promise yet:

- **Data model** (`packages/api/prisma/schema.prisma`): Device, Screen, DeviceBinding, PlayLog, WorkspaceSettings.
  No Asset, Ad or placement.
- **Playback**: every linked screen plays one global demo rotation (`buildDeviceState` → `deps.loadRotation()`).
  `manifestItemSchema.advertiser` is just a free string.
- **Pencil**: `advertiser-assets`, `advertiser-ads`, `advertiser-calendar` and `advertiser-search` are early
  Colombia/COP mockups. None of them has an approval state.
- **Email**: the API sends none. Only Identity sends invites.

Approval can't be specified on its own because it needs something to approve (assets), a unit that asks for
screens (ads) and a way for the decision to reach the TV (a rotation per screen). The user first chose one change,
then switched to building the advertiser side first (see the sequencing note above).

**Decisions so far**
- Two changes: `advertiser-ads` first, then `ad-review`.
- Owners decide **per owner, with an opt-out per screen**.
- A request nobody answers **expires and is never auto-approved**.
- Proyecta runs **automated checks only**, with no staff review queue.

## Research findings (what the market does)

| Platform | Pattern | Take for Proyecta |
|---|---|---|
| [Blip](https://help.blipbillboards.com/the-approval-process) | Blip approves first (Tier 1), then each sign owner approves for their own sign. Takes 24–48h and can't be expedited. [Rejections](https://help.blipbillboards.com/my-artwork-wasnt-approved-what-do-i-do-next) have categories (quality, readability, content, competitor exclusivity). You're charged only once the ad runs. | Take the per-owner approval, the reason categories and "you only pay once it plays" (PPD already works that way). Skip the staff tier. |
| [Vistar](https://www.vistarmedia.com/blog/4-ways-inventory-control-dooh) | "A creative cannot run on your network unless someone on your team has seen and approved it." Owners can also set category and advertiser block/allow lists. | Take the hard rule: nothing plays without an approval. Category rules come later. |
| [Hivestack](https://docs.hivestack.com/docs/creative-approval) | Approval is recorded per creative file, per publisher. An approved creative is reused across deals without another review. | Key the approval to the immutable file. Reuse an existing approval on the same screen. |
| [Broadsign AI Assistant](https://broadsign.com/blog/broadsign-previews-industry-first-ooh-ai-creative-categorization-and-approval-assistant-for-its-programmatic-ssp/) | Suggests an approve/reject decision and a category. The owner accepts in bulk or reviews. | Later: AI pre-screening. Not in v0. |
| [Airbnb request-to-book](https://www.airbnb.com/help/article/28) | The host has a fixed window. The request then expires, is never auto-accepted, and hurts the host's response rate. | Requests expire. Later: an owner response-rate signal in search. |

**What this means for Proyecta**
1. The hard part isn't the approve button. It's that an ad lives in **many independent states at once**, one per
   screen. The advertiser UI has to show an overall status plus a status for each screen.
2. **Partial go-live**: an ad starts playing on each screen the moment that screen is approved, without waiting for
   the other owners. This is fair because pay-per-display only bills plays that happen.
3. Valleros are small businesses (gyms, clinics, restaurants) who rarely open a dashboard. **Email is what drives
   decisions**; without it, requests silently expire.

## Domain model (recommended)

Internal names are in English and UI copy is in Spanish. Everything is owned by a workspace `accessKeyId`, and one
business can be both a screen owner and an advertiser.

- **`Asset`**: an advertiser's uploaded file. It is **immutable**; replacing it creates a new Asset.
  - Fields: `workspaceAccessKeyId`, `name`, `type` (IMAGE/VIDEO), `durationMs` (a multiple of 5000; for images the
    advertiser picks 5/10/15 s), `width`, `height`, `sha256`, renditions (via `scripts/transcode.sh`), `createdAt`.
  - Upload runs the automated checks: format (MP4/WebM/JPG/PNG/WebP), size limit, video duration a multiple of 5 s,
    minimum resolution. Each failure returns a Spanish error.
- **`Ad`**: the advertiser workspace, `name`, `assetId` (current), `startDate`, `endDate` and `state`
  (DRAFT | SUBMITTED | CANCELED).
- **`AdPlacement`**: one row per (ad, screen, asset). It is both the unit of decision and the source of the rotation.
  - `status`: PENDING | APPROVED | REJECTED | REVOKED | WITHDRAWN
  - Decision fields: `decidedAt`, `decidedByUserId`, `reasonCode`, `note`
  - Rows are history and are never rewritten. Replacing the file adds new rows.

**Status transitions**

```
PENDING  ─owner approves─▶ APPROVED ─owner stops─▶ REVOKED
   │                          └─advertiser removes screen / cancels ad─▶ WITHDRAWN
   ├─owner declines / unchecks screen─▶ REJECTED
   └─advertiser removes screen / cancels─▶ WITHDRAWN
"Sin respuesta" = PENDING whose ad has ended (derived when read; no cron, no stored EXPIRED)
```

**Rules**
- **Grouping**: an owner sees one request per (ad, owner workspace) and decides once. Screens they uncheck become
  REJECTED with reason `NOT_SUITABLE_FOR_VENUE`. Unchecking everything is a full rejection.
- **Reason codes**: `INAPPROPRIATE_CONTENT`, `COMPETITOR`, `NOT_SUITABLE_FOR_VENUE`, `LOW_QUALITY`, `OTHER`.
  `OTHER` requires a note. The advertiser sees the reason.
- **Approval reuse**: a new placement starts APPROVED when the same asset is already APPROVED (not revoked) on that
  same screen. Reuse is per screen, not per owner, so an opt-out stays respected.
- **Your own screens**: placements on screens the advertiser's own workspace owns start APPROVED (private networks,
  "contenido del vallero").
- **Replacing the file** adds PENDING rows with the new asset on every screen that isn't withdrawn. Where the old
  file was APPROVED, **it keeps playing** until the new one is approved, then it's superseded, so the screen never
  goes dark.
- **Automated fit at ad creation**: the screen picker only offers screens that are ACTIVE, complete (have a rate)
  and whose orientation matches the asset. The owner never has to reject for technical reasons.
- **Rotation**: `buildDeviceState` builds a manifest for each screen from placements that are APPROVED, inside
  the ad's date range, and not superseded. The manifest `advertiser` is the advertiser workspace name. Any
  placement change emits the existing `rotation-updated` SSE event. This is **additive** to `/device/v1`: same
  shapes, content per screen.
- **Permissions**: admin/owner submit, decide and revoke; a member only views. The guards reuse
  `workspaceProcedure` / `adminProcedure`, and access is checked by the screen's workspace.
- **Out of scope** (listed as non-goals): capacity or share-of-voice (approval doesn't reserve a slot), calendar
  view, advertiser charging or invoices, category block lists, AI pre-screen, WhatsApp notifications, response-rate
  ranking.

## Derived ad status (advertiser)

Checked in priority order; the first match wins:
1. Borrador
2. Cancelado
3. Finalizado (past `endDate`)
4. **Al aire** / **Programado**: at least one placement is effectively APPROVED. Subtitle: "en 3 de 5 pantallas".
5. **En revisión**: at least one placement is PENDING.
6. **Requiere atención**: every placement is rejected, revoked or unanswered.

Separately, an attention dot shows whenever any placement is REJECTED, REVOKED or unanswered.

## UI/UX (Pencil first, then build)

**Owner side**
- **Nav**: a new "Solicitudes" item with a count of pending requests, pushed live over the existing dashboard
  stream (`useLiveStatus`).
- **`owner-requests`**: tabs Pendientes / Aprobadas / Rechazadas. Each row shows:
  - thumbnail, advertiser business, ad name
  - duration · dates · "2 de tus pantallas"
  - estimated earnings for the period (the screen's PPD rate × estimated plays, labeled as an estimate)
  - urgency label: "Empieza el 1 jun" or "Ya empezó"
- **`owner-request-review`**, the page where the owner decides:
  - Large looping preview framed in the aspect ratio of each of their screens.
  - Facts: anunciante, formato, duración, fechas.
  - A checklist of their screens in this ad, all checked, each with its rate and estimate. Hint: "Ya aprobaste este
    archivo en Gimnasio Norte".
  - Primary action: **"Aprobar en N pantallas"**. Secondary: **"Rechazar"**.
- **`owner-reject-dialog`**: reason radios plus a note (required for "Otro"), with the copy "El anunciante verá el
  motivo".
- **Screen detail**: a new card "Anuncios en esta pantalla" lists the approved ads, each with a "Detener" action
  that opens **`owner-revoke-dialog`** ("Deja de reproducirse en la próxima sincronización. Las reproducciones ya
  hechas se mantienen.").

**Advertiser side** (reworks the Colombia mockups to DR/US$ with the current dashboard components)
- **`advertiser-assets`**: upload, with automated-check errors shown inline.
- **`advertiser-ad-new`**, a four-step wizard:
  1. Archivo
  2. Pantallas: filters for city and place type; your own screens are tagged "Tuya · sin revisión"; incompatible
     screens are hidden, with a count and the reason.
  3. Fechas
  4. Revisar y enviar: "Cada vallero revisa tu anuncio. Sale al aire en cada pantalla en cuanto se aprueba. Solo
     pagas por reproducción."
- **`advertiser-ads`**: the list, with the derived status badge and "3/5 aprobadas".
- **`advertiser-ad-detail`**:
  - A table with one row per screen: screen, business, a status badge, and the reason if rejected.
  - Badges: En revisión, Aprobado, Al aire, Rechazado, Detenido por el vallero, Sin respuesta.
  - Actions for a REJECTED, REVOKED or unanswered screen: "Reemplazar archivo", "Quitar pantalla" and
    "Agregar otras pantallas".
- **Nav**: controlled by the dashboard view (see the plan at the top of this file). `BOTH` shows the owner
  group (Pantallas, Solicitudes) and the advertiser group (Buscar pantallas, Recursos, Anuncios) as labeled groups.

**Email** (new mailer over SMTP; Mailpit on port 1026 locally; Spanish; branded like the Identity invite)
- **To the owner**: new request (one per ad and owner), plus a reminder 24 h before the ad starts if the request is
  still pending.
- **To the advertiser**: once per owner decision, as one email covering that owner's screens rather than one per
  screen. Also when an owner stops an ad.

## OpenSpec changes

### Change 1: `advertiser-ads` (build first)

- **`proposal.md`**:
  - Why: the site promises "sube tu anuncio, míralo al aire".
  - Depends on `device-protocol`, `owner-dashboard` and `pay-per-display` (now synced into `openspec/specs/`).
  - Non-goals: owner review UI, emails, reject/revoke. Those move to `ad-review`.
- **`design.md`**: the domain model, the full status set (only some of it is used here), the derived ad status and
  the "PENDING never plays" guardrail. Rejected alternatives:
  - letting placements on other owners' screens play before approval exists (breaks "Tú decides")
  - storing ad state instead of deriving it from placements
  - blocking the replacement file (screens go dark)
- **`specs/`**:
  - `advertiser-assets` (new): upload, automated checks, immutability, transcoding, the Recursos library.
  - `ads` (new): the create wizard, compatible screen picker (your own screens tagged, incompatible ones hidden),
    dates, submit/cancel, remove screen, replace file (the old approved file keeps playing), derived status, a status
    badge per screen. For now: Esperando aprobación, Al aire, Programado, Finalizado.
  - `device-sync` (modified): the rotation is built per screen from placements that are effectively APPROVED and
    inside their dates; `rotation-updated` fires on placement changes; additive to v1.
  - `owner-dashboard-navigation` (modified): the advertiser nav group (Buscar pantallas, Recursos, Anuncios).
- **`tasks.md`**:
  1. Pencil frames: `advertiser-assets`, `advertiser-ad-new` (4 steps), `advertiser-ads`, `advertiser-ad-detail`.
     All redone in DR/US$ with the current components.
  2. Common schemas in `@proyecta/common`: `asset.schema.ts` and `ad.schema.ts`, reusing `manifestItemSchema`.
  3. Prisma migration: `Asset`, `Ad`, `AdPlacement` with the full status enum.
  4. Validated functions in `packages/api/src/api/{assets,ads}/create*.ts`, following `createRegisterDevice.ts`.
  5. Asset storage and transcoding (`scripts/transcode.sh`).
  6. Per-screen rotation in `buildDeviceState` plus the events.
  7. tRPC routers and dashboard routes.
  8. Tests: unit, integration and e2e.

### Change 2: `ad-review` (next)

- **`specs/`**:
  - `ad-review` (new): requests grouped by owner, approve with opt-out per screen, reject reasons, reuse on the same
    screen, revoke, "Sin respuesta", permissions, emails (a new SMTP mailer; Mailpit locally).
  - `ads` (modified): the Rechazado / Detenido por el vallero / Sin respuesta badges, the reason shown to the
    advertiser, "Requiere atención", and the Reemplazar/Quitar/Agregar actions.
  - `owner-dashboard` (modified): the Solicitudes nav item with its live count, and the screen-detail "Anuncios en
    esta pantalla" card with Detener.
- **Pencil**: `owner-requests`, `owner-request-review`, `owner-reject-dialog`, `owner-revoke-dialog`, and the
  mixed-status state of `advertiser-ad-detail`.
- **Design alternatives rejected**:
  - approval per owner workspace (breaks the screen opt-out)
  - auto-approval (breaks "Tú decides")
  - an EXPIRED status set by cron (a derived value is simpler)

**Reuse in both changes:**
- `withErrorHandlingAndValidation` for the validated functions
- `validate(schema)` for Spanish field errors
- `createRotationLoader`'s manifest validation
- `DeviceBinding` attribution plus the PPD snapshot on PlayLog (unchanged: plays of approved ads bill as today)
- `useLiveStatus` for live pushes

## Execution steps (after approval)

1. `/opsx:propose advertiser-ads`, seeded with this plan (change 1 only; the full model stays in `design.md`).
2. Review the artifacts with the user, especially the scenarios for the PENDING guardrail, your own screens and file
   replacement.
3. `/ps:ship advertiser-ads`: design gate in Pencil (main checkout's `design/pencil.pen`) → spec reconcile → build →
   tests → sync → archive.
4. Then `/opsx:propose ad-review` and `/ps:ship ad-review`.

## Verification

**Change 1**
- `openspec validate advertiser-ads --strict` passes, with scenarios for:
  - an ad on your own screen plus another owner's screen → only your own plays; the other shows "Esperando
    aprobación"
  - a portrait asset → landscape screens are not offered
  - an upload of 17 s → rejected with a Spanish error
  - replacing the file → the approved screen keeps the old file until the new one is approved
  - cancel → `rotation-updated` and the ad leaves the manifest
- Built: `npm run lint && npm run typecheck && npm test`; `npm run test:integration` (placement → per-screen
  manifest); a Playwright e2e: upload → create an ad on your own screen → linked player receives it → status "Al
  aire".

**Change 2**
- Scenarios for:
  - two owners, one approves and one rejects → on air only on the approved screens
  - unchecked clinic screen → REJECTED with `NOT_SUITABLE_FOR_VENUE`
  - revoke → the ad drops from the manifest
  - pending past `endDate` → "Sin respuesta", never plays
  - a member tries to approve → forbidden
- Emails show up in Mailpit (port 8026).

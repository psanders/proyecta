## Context

See proposal.md. `advertiser-ads` already stores one `AdPlacement` row per (ad, screen, file) with the full status set
(`PENDING | APPROVED | REJECTED | REVOKED | WITHDRAWN`), `decidedAt` and `withdrawnAt`; the effective placement of an
(ad, screen) is its most recently created APPROVED row; per-screen rotations, `notifyScreens` and the schedule sweeper
exist; `adScreenStatus`/`adStatus` in `@proyecta/common` derive what advertisers see. Owners have no way to read or change
another business's placements. Notifications are in-app only (user decision, 2026-09-15).

## Goals / Non-Goals

**Goals:** owners decide per screen with one action; decisions are history, never rewritten; nothing a business can read
through a request reveals another owner's screens; the advertiser's view needs no new queries beyond extra fields.

**Non-Goals:** notifications outside the dashboard, undoing a rejection, owner-side analytics or earnings estimates per
request.

## Decisions

- **A request is (ad, owner business), not a stored row.** It is derived from placements whose screen belongs to the
  viewer's business and whose ad belongs to another business; its id in URLs and APIs is the ad id, always scoped by the
  viewer's `workspaceAccessKeyId` on the screen join. Alternative: a `ReviewRequest` table — rejected, it would duplicate
  placement state and need syncing on every file replacement or screen change.
- **Decision fields on `AdPlacement`:** `reasonCode` (`INAPPROPRIATE_CONTENT | COMPETITOR | NOT_SUITABLE_FOR_VENUE |
  LOW_QUALITY | OTHER`, nullable), `note` (≤ 280), `decidedByUserRef`. `decidedAt` already exists. Approve/reject/revoke
  are guarded `updateMany` calls filtered by the expected current status, so a double click or a race with the advertiser
  (cancel, replace, remove) changes nothing twice; the function then re-reads and reports the result.
- **Approve acts on the current file only:** pending rows with `assetId = ad.assetId` on the viewer's screens. Pending
  rows of older files are already withdrawn by `createReplaceAdAsset`. Unchecked pending screens become REJECTED with
  `NOT_SUITABLE_FOR_VENUE` in the same transaction.
- **Revoke** sets the screen's APPROVED and PENDING rows for that ad to REVOKED (with note and decider). It requires at
  least one APPROVED row; otherwise `errors.review.notApproved`.
- **History is kept:** `createRemoveAdScreen` now withdraws only PENDING and APPROVED rows, so REJECTED/REVOKED rows stay.
  "In the ad" for adding a screen means it has a PENDING or APPROVED row; `createReplaceAdAsset` still creates a new row
  for every screen with any non-withdrawn row (asking rejecting owners again is the point of replacing the file).
- **Reuse** is decided in `initialPlacement`, now async: own screen → APPROVED; else the latest row with `decidedAt` for
  (assetId, screenId) across all ads — if it is APPROVED, or WITHDRAWN (only approved or pending rows are ever withdrawn,
  and pending ones have no `decidedAt`), the new row starts APPROVED with `decidedAt = now` and the reused decider; if it
  is REJECTED or REVOKED, or there is none, it starts PENDING. One grouped query per call, not per screen.
- **Derived statuses** (`@proyecta/common`): `adScreenStatus` gains `REJECTED`, `REVOKED`, `NO_RESPONSE` (replacing the
  unused `NOT_APPROVED`) and returns the latest decision's `reasonCode`/`note`; `adStatus` gains `NEEDS_ATTENTION` before
  `NO_SCREENS`. Owner-side per-screen status reuses the same function plus the "Sin respuesta" rule. A request is
  pending when any of its screens is `PENDING_APPROVAL`.
- **Pending count** is a cheap `count` of distinct ads (group by `adId`) with pending current-file rows on the viewer's
  screens for SUBMITTED ads with `endsAt > now`. The dashboard polls it every 30 s and invalidates it after decisions;
  no new push channel.
- **Rotation updates:** approve and revoke call the existing `notifyScreens` with the affected screen ids.
- **Dashboard:** `/requests` (tabs), `/requests/:adId` (preview with the image or a muted looping video, screen
  checklist, approve, reject dialog; revoke per screen once reviewed), screen detail "Anuncios en esta pantalla"
  (`adReview.screenAds`), Solicitudes nav item with a count badge in the owner group, a `HiddenSideBanner` in
  `AppLayout` when the view is `ADVERTISER` and the count is > 0. Advertiser ad detail shows reasons and notes.
- **Pencil frames:** `owner-requests`, `owner-request-review`, `owner-reject-dialog`, `owner-revoke-dialog`,
  `advertiser-ad-detail-attention`, and Solicitudes in `dashboard-nav-views`.

## Risks / Trade-offs

- [Owners may never open the dashboard, so requests go unanswered] → the pending count and banner are the only signal in
  this change; emails are the next follow-up. "Sin respuesta" makes the outcome explicit instead of silent.
- [Reuse means an owner who approved a file once will get it again on a later ad without being asked] → matches the
  Hivestack model agreed in research; stopping it breaks reuse for that file on that screen.
- [Deriving requests on read gets heavier with many placements] → indexed by `(screenId, status)`; fine for v0 volumes.

## Migration Plan

1. Additive migration: `review_reason` enum, `ad_placements.reason_code`, `note`, `decided_by_user_ref`. No backfill.
2. Rollback: older API ignores the new columns; placements decided by owners stay valid rows.

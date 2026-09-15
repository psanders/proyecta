## 1. Design (Pencil)

- [x] 1.1 Add `owner-requests`, `owner-request-review`, `owner-reject-dialog` and `owner-revoke-dialog` frames; verify with Pencil screenshots
- [x] 1.2 Add `advertiser-ad-detail-attention` (rejected, stopped, no response) and the nav with Solicitudes and its count (shown in the section 6 frames); verify with Pencil screenshots

## 2. Shared contracts

- [x] 2.1 Add `REVIEW_REASONS`, approve/reject/revoke/request-id schemas and request views in `adReview.schema.ts`; verify unit tests incl. "Otro" without a note
- [x] 2.2 Extend `adScreenStatus` (REJECTED, REVOKED, NO_RESPONSE with reason/note) and `adStatus` (NEEDS_ATTENTION); verify unit tests for every precedence case
- [x] 2.3 Add API and dashboard messages (es + en); verify typecheck

## 3. Database

- [x] 3.1 Add `reasonCode`, `note`, `decidedByUserRef` to `AdPlacement` with an additive migration; verify `prisma migrate deploy` on the dev and test databases

## 4. API

- [x] 4.1 Reuse in `initialPlacement` and history-preserving remove/add in the ad functions; verify updated ad unit tests
- [x] 4.2 `createListRequests`, `createGetRequest`, `createGetPendingRequestCount`, `createListScreenAds`; verify unit tests (scoping, tabs, no response)
- [x] 4.3 `createApproveRequest`, `createRejectRequest`, `createRevokePlacement` with notify; verify unit tests incl. validation failure, cancelled/ended ads and foreign screens
- [x] 4.4 `adReview` tRPC router; verify guard tests (member can read, cannot decide)
- [x] 4.5 Integration test: advertiser ad on another business's screen → owner approves one screen and rejects the other → rotation contains the ad → owner stops it → rotation without it → advertiser statuses

## 5. Dashboard

- [x] 5.1 Solicitudes nav item with count, `/requests` tabs and `/requests/:adId` review with approve, reject and revoke dialogs; verify in the running app (e2e)
- [x] 5.2 Screen detail "Anuncios en esta pantalla" card with stop; verify in the running app
- [x] 5.3 Advertiser ad detail and list: new statuses, reasons and notes, Requiere atención; verify in the running app
- [x] 5.4 Hidden-side banner with "Mostrar ambos"; verify in the running app

## 6. Tests

- [x] 6.1 Playwright e2e: advertiser business creates an ad on an owner business's screen → owner sees the count, approves → owner's player receives the ad → advertiser sees Al aire; owner stops it → advertiser sees Detenido por el vallero
- [x] 6.2 Green gate: lint, typecheck, prettier, unit, integration and e2e

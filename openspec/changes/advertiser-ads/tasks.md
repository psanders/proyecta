## 1. Design (Pencil)

- [x] 1.1 Rework `advertiser-assets`, `advertiser-ads` and `advertiser-search` (as `advertiser-explore`) to DR/US$ with the current dashboard components; verify with Pencil screenshots
- [x] 1.2 Add `advertiser-ad-new` (screens and review steps), `advertiser-ad-detail`, `onboarding-view-choice`, `workspace-settings-view` with its switch dialog, and the grouped nav (`dashboard-nav-views`); verify with Pencil screenshots

## 2. Shared contracts (`@proyecta/common`)

- [x] 2.1 Add `DASHBOARD_VIEWS`, view schemas (`setDashboardViewSchema`, optional view on `createWorkspaceSchema`) and extend `WorkspaceSettingsView`; verify with a schema unit test including an invalid view
- [x] 2.2 Add `asset.schema.ts` (upload query, limits, accepted types, `billableVideoDurationMs`, `orientationFor`, views) with unit tests for duration rounding, limits and orientation
- [x] 2.3 Add `ad.schema.ts` (create/add screens/remove screen/replace asset/cancel/list inputs, catalog filter, ad and screen status derivation, views) with unit tests covering every status precedence case
- [x] 2.4 Extend `accounting.schema.ts` with `housePlays` on windows and ad stats types; add the API message ids (es + en) for every new validation and domain error; verify `apiMessages` test passes

## 3. Database

- [x] 3.1 Update `schema.prisma` (dashboardView, Asset, Ad, AdPlacement, PlayLog attribution) and generate an additive migration; verify `prisma migrate deploy` on the dev and test databases and `npm run db:generate`

## 4. API: dashboard view

- [x] 4.1 Extend settings functions (read view, `createSetDashboardView`, create business with view, `createGetWorkspaceActivity`) and the workspaces router; verify unit tests incl. validation failure and member-forbidden

## 5. API: assets

- [x] 5.1 Implement media ports (`createFfprobe`, ffmpeg rendition renderer, content store) and `createUploadAsset` with checks; verify unit tests with stubbed probe/storage (odd duration, too small, unreadable, image without duration)
- [x] 5.2 Implement the rendition queue (READY/FAILED, re-enqueue on start) and `createListAssets` / `createDeleteAsset`; verify unit tests
- [x] 5.3 Add `POST /uploads/assets` (streamed, size-limited, auth + admin + localized errors), `/content` static serving, `CONTENT_DIR` config; verify an integration test uploading a generated image

## 6. API: ads and rotation

- [x] 6.1 Implement `createListCatalogScreens`, `createCreateAd`, `createAddAdScreens`, `createRemoveAdScreen`, `createReplaceAdAsset`, `createCancelAd`, `createListAds`, `createGetAd` (with stats); verify unit tests incl. a validation-failure case
- [x] 6.2 Implement per-screen rotation (`createScreenRotationLoader`) in `buildDeviceState`, `createNotifyScreens` after ad mutations and `createAdScheduleSweeper`; verify unit tests and an integration test that a device state contains an own-screen ad and never a pending one
- [x] 6.3 Attribute plays in `createRecordPlayLogs` (placement, advertiser, house) and count house plays in `createGetScreenEarnings`; verify unit tests for house, cross-business and non-ad plays
- [x] 6.4 Add the `assets` and `ads` tRPC routers; verify guard tests (member can read, cannot mutate)

## 7. Dashboard

- [x] 7.1 Grouped sidebar per view, index redirect for advertisers, view choice on the welcome step and create business, view field + switch confirmation in Configuración; verify in the running app (e2e)
- [x] 7.2 Recursos page (upload with duration for images, processing state, delete); verify in the running app (e2e)
- [x] 7.3 Buscar pantallas catalog and Anuncios list; verify in the running app (e2e)
- [x] 7.4 New ad flow (file → screens → dates → review) and ad detail (per-screen status, plays/spend, add/remove screens, replace file, cancel); verify in the running app (e2e covers create; replace/add/remove/cancel covered by integration + unit tests)
- [x] 7.5 "propias (sin costo)" line on screen detail; Spanish and English messages for everything new; verify typecheck

## 8. Infra and tests

- [x] 8.1 Add ffmpeg to the API image, a `CONTENT_DIR` volume in compose, nginx upload/content routes and the deploy doc; `docker build` not run locally (documented in the PR)
- [x] 8.2 Playwright e2e: sign up choosing Ambos, pair a player and publish a screen, upload an image, create an ad on the own screen, see Al aire and the player receive the ad, switch the view to Anunciar; verify `npm run test:e2e`
- [x] 8.3 Green gate: `npm run lint && npm run typecheck && npm test` and `npm run test:integration`

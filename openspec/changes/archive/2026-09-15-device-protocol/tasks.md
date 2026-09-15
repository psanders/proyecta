## 1. Data model

- [x] 1.1 Prisma: Screen (fields, status, deletedAt, workspaceAccessKeyId), DeviceBinding (+ partial unique indexes in SQL), PlayLog (unique device/item/start), Device token hash + health fields; verify migration applies from empty and integration test proves the partial indexes

## 2. Contracts

- [x] 2.1 `@proyecta/common`: screen create/update schemas (Spanish messages, hours check, completeness helper), pairing schemas, device protocol schemas (register response, state, event union, heartbeat, play-log batch); verify schema unit tests

## 3. Screens and pairing (API functions)

- [x] 3.1 Validated functions: createScreen, updateScreen, listScreens (with status + totals), getScreen, archiveScreen, deleteScreen; verify unit tests incl. foreign workspace and linked-screen refusal
- [x] 3.2 Validated functions: checkPairingCode, linkDevice (transaction, conflict mapping), unlinkDevice, registerDevice token rotation; verify unit tests and an integration test for the race (exactly one link)
- [x] 3.3 Event hub + status derivation + sweeper; verify unit tests with fake timers

## 4. Transports

- [x] 4.1 tRPC `screens` router with guards and `onStatus` subscription; verify router unit tests for forbidden/not found
- [x] 4.2 `/device/v1` auth middleware, `state`, `events` (SSE), `heartbeat`, `play-logs`; default rotation loader and `/media`; verify integration test: register → stream receives state → link → linked event → unlink → unlinked event
- [x] 4.3 Rate limiting for check/link; verify unit test

## 5. Player

- [x] 5.1 Protocol client (register with hardware id, fetch-based SSE parser, state polling fallback, heartbeat, play-log flush); verify unit tests for the SSE parser and fallback switching
- [x] 5.2 Boot flow: pairing with real code → playback on linked → pairing on unlinked; remove `/dev/manifest` usage; verify Playwright e2e linking via the API
- [x] 5.3 Lint, typecheck, unit, integration and e2e green

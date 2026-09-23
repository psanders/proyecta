## 1. Device spike and design

- [ ] 1.1 Build a device matrix (model, Android version, WebView version, Play Store yes/no, RAM) from the boxes and TVs available in the DR; record it in `shells/android/README.md`
- [ ] 1.2 Load a `plugin-legacy` player build on the oldest devices, then set `MIN_WEBVIEW_MAJOR` and the legacy target (D6)
- [ ] 1.3 Measure peak memory for blob-URL playback of a cached 1080p video on a 1 GB box (D7 risk)
- [x] 1.4 Pencil: add the `player-unsupported` frame (1600×900, `player-pairing` tokens); wait for approval

## 2. Contracts (common)

- [x] 2.1 Add the optional heartbeat fields to `heartbeatSchema` (`shellVersion`, `deviceModel`, `osVersion`, `cpuCores`, `cpuScope`, `deviceMemoryApproxGb`, `diskUsedMb`, `diskTotalMb`, `jsHeapUsedMb`), and add doc comments giving the exact meaning of `memory*` and `storage*`
- [x] 2.2 Add `shellInfoSchema` and `shellMetricsSchema`, which the Android bridge and the kiosk helper share
- [x] 2.3 Unit tests: old heartbeats still parse, the new fields parse, and bad values (e.g. a negative `cpuCores`) fail validation

## 3. API

- [x] 3.1 Heartbeat guard in `createRecordHeartbeat`: drop `memoryUsedMb`/`memoryTotalMb` when `shellVersion` is absent (D8), with unit tests
- [x] 3.2 Integration test: a BROWSER heartbeat with memory fields is stored without them, and a shell heartbeat keeps them
- [x] 3.3 Allow CORS on `/device/v1`, `/media` and `/content` for `https://appassets.androidplatform.net` only; test it
- [x] 3.4 Expose the shell, shell version and device model in the tRPC screen/device detail output (already there: `views.ts` returns `shell` and the whole `health` JSON)

## 4. Player

- [x] 4.1 Add `shellInfo.ts`, which reads the bridge, then the helper (`/shell/info`, 500 ms timeout), then browser APIs (D5), with unit tests for each source and for an invalid payload
- [x] 4.2 Make `resolveHardwareId` and `shell()` use `shellInfo`, keeping `?hw=` as a fallback
- [x] 4.3 `sendHeartbeat`: send shell figures from `metrics()`; in a plain browser send only `cpuCores`, `deviceMemoryApproxGb`, `storage*` and `jsHeapUsedMb`. Stop sending the heap as `memory*`
- [x] 4.4 Offline rotation: store the last rotation, cache renditions in Cache Storage `proyecta-media-v1`, play from cache first, evict after a full sync, and start from the stored rotation when there's no network (D7)
- [x] 4.5 Add `VITE_API_BASE` for absolute API URLs in the Android build; leave it empty for the browser and kiosk builds
- [x] 4.6 Add `@vitejs/plugin-legacy` with the target from 1.2, and update the `vite.config.ts` comment (working value `MIN_CHROMIUM = 69`; revisit after 1.2)
- [ ] 4.7 E2E: with a mocked `window.ProyectaShell`, the heartbeat carries the shell figures; after going offline and reloading, the player resumes the cached rotation

## 5. Dashboard

- [x] 5.1 Add message ids in `messages/{es,en}.ts`: the player type labels, "Requiere la app Proyecta" plus its hint, "No disponible en este equipo" and "Sin datos todavía"
- [x] 5.2 `DevicePanel.tsx`: add player type, shell version and model rows, and `missingReason()` for CPU, RAM and disk; relabel storage as the player cache
- [ ] 5.3 E2E: a browser player shows "Requiere la app Proyecta"; a shell heartbeat shows RAM and model

## 6. Android shell

- [x] 6.1 Set up the Gradle project in `shells/android` (Kotlin, minSdk 21, AndroidX WebKit), with a copyright header on every source file
- [x] 6.2 Build a Gradle task that runs the player build and copies `dist/` into `assets/player/`; serve it through `WebViewAssetLoader` (D2)
- [x] 6.3 `PlayerActivity`: immersive mode, keep-screen-on, autoplay without a gesture, HOME and LEANBACK launcher, and a `BOOT_COMPLETED` receiver
- [x] 6.4 Recover from renderer crashes with `onRenderProcessGone`
- [x] 6.5 `ProyectaShell` bridge: `hardwareId`, `shell`, `version`, `info` and `metrics` (D3), with unit tests for the metrics parsing
- [x] 6.6 Check the WebView version and show the unsupported screen from the `player-unsupported` frame (D10: a static `unsupported.html` built with the player, plus a native text fallback when no WebView exists)
- [ ] 6.7 Verify on an emulator (API 21 and current) and one real box: airplane mode then reboot plays, killing the renderer recovers, reinstalling keeps the same code (done so far: API 35 emulator boots the bundled player offline to the pairing screen)

## 7. Kiosk helper and packaging

- [x] 7.1 Create the `shells/kiosk/helper` Go module: a static file server bound only to `127.0.0.1:47800`, a reverse proxy for `/device`, `/media` and `/content`, and `/shell/info` and `/shell/metrics` on Linux (D4), with Go tests
- [x] 7.2 Windows metrics and service support in the helper
- [x] 7.3 Linux packaging: systemd units (the helper first, then the cage + Chromium kiosk), the `proyecta` user, and the `nfpm` `.deb` for amd64 and arm64
- [x] 7.4 Windows packaging: an Inno Setup installer that registers the helper service and the Edge kiosk logon task
- [ ] 7.5 Verify Linux in a VM: install, reboot, the player is on screen; with the network off it still plays; after killing the helper, playback continues and the helper is back within 10 s; the LAN can't reach the port
- [ ] 7.6 Verify Windows on a VM or real PC: install, reboot, the player is in the Edge kiosk

## 8a. Downloads store and page

- [x] 8a.1 Pencil: `web-download` and `web-download-mobile` frames (hero with the live version, platform cards, "¿Ya lo instalaste?" next step, help card); approved
- [x] 8a.2 Droplet store: mount `downloads/` read-only in the proxy and serve it at `api.proyecta.do/downloads/` (CORS, `latest.json` uncached, versioned files immutable)
- [x] 8a.3 `scripts/downloads/manifest.mjs`: builds `latest.json` from a release's files (platform, arch, name, url, size, sha256), with `node --test` tests
- [x] 8a.4 `shells.yml`: publish job (production environment) uploads `v<version>/` over SSH, then swaps `latest.json` atomically
- [x] 8a.5 `packages/web`: `/download` page from the frames, copy in `strings.ts`, reads `latest.json` and falls back to the GitHub release; unit tests for the release parsing
- [x] 8a.6 E2E: the page shows the version and links from a mocked `latest.json`, and falls back when it fails
- [ ] 8a.7 Follow-up (not in this change): move installation steps to the docs; decide on a friendlier downloads URL

## 8. Release and docs

- [x] 8.1 Add a `shells` job to `release.yml`: build the APK (signed from secrets), both `.deb` files and the Windows installer, and attach them to the release
- [x] 8.2 Record the production-side needs. Nothing goes in `docs/deploy/PENDING.md`: the WebView CORS rule is code (`shellCors.ts`) and `api.proyecta.do` already exists. The Android signing-key secrets and their offline backup are documented in `shells/android/README.md` and `.github/workflows/shells.yml`
- [x] 8.3 Update CLAUDE.md with the measured engine floor and the kiosk helper, and replace the placeholder READMEs in `shells/android` and `shells/kiosk`
- [ ] 8.4 Green gate: `npm run lint && npm run typecheck && npm test`, plus the integration and e2e runs

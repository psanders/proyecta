## Context

`packages/player` runs today as a plain browser tab:

- **Hardware id and shell type.** `hardwareId.ts` takes the id from `window.ProyectaShell`, then `?hw=`, then a
  `browser-<uuid>` kept in localStorage. `main.ts` `shell()` reads `ProyectaShell.shell()` and falls back to
  `BROWSER`. No shell exists yet (`shells/*` only has READMEs).
- **Health figures are misleading.** `main.ts` `sendHeartbeat` sends `performance.memory` (the tab's JS heap) as
  `memoryUsedMb`/`memoryTotalMb`, and `DevicePanel.tsx` labels it "Memory (RAM)". `storageUsedMb`/`storageQuotaMb`
  come from `navigator.storage.estimate()`, which is the origin's quota, not the disk.
- **Nothing survives offline.** Only the session (code + token) is cached, in localStorage. Rotation and media stream
  from the server (`/media`, `/content`), so a reboot with no network plays nothing.
- **The build targets `chrome108`** (`vite.config.ts`), a provisional minimum set before any device testing.

Heartbeats land in `packages/api/src/device/router.ts` → `createDeviceSyncFunctions.ts`, and are stored as JSON in
`Device.health`.

## Goals / Non-Goals

**Goals:**

- Installers for Android, Linux and Windows that turn a box into a screen, need no one touching the device, and play
  after a reboot with no network.
- Health figures whose meaning is exact, from the best source available on each platform.
- Reach as many Android devices as the WebView engine allows.

**Non-Goals:** see the proposal. In short: player updates without reinstalling, store listings, a native fallback
player, a bundled browser engine, remote control.

## Decisions

### D1. Android: Kotlin + system WebView, not Flutter

A single `PlayerActivity` (immersive, `FLAG_KEEP_SCREEN_ON`, `mediaPlaybackRequiresUserGesture = false`). A
`BOOT_COMPLETED` receiver, and a HOME + LEANBACK_LAUNCHER intent filter so it can be the launcher. `onRenderProcessGone`
destroys the WebView, builds a new one and reloads. minSdk 21, targetSdk current.

*Alternatives:*

- **Flutter + `webview_flutter`.** It drives the same system WebView, so it reaches no more devices. It adds the
  Flutter engine (~5–8 MB) and a plugin layer between us and WebView settings.
- **Flutter native player.** This would be a second player in Dart. The Pencil-exact branding and the playback logic
  would have to be duplicated and kept in sync.
- **GeckoView.** Independent of the system WebView, but ~50 MB per APK, and it breaks the project's "Chromium
  engine" rule.

The limit on reach is the WebView version, which D6 addresses.

### D2. Android assets through `WebViewAssetLoader`

The player's `dist/` is copied into `app/src/main/assets/player/` at build time and served at
`https://appassets.androidplatform.net/player/`. The origin is https and stable, so localStorage, Cache Storage and
secure-context APIs work. API calls go to the absolute production origin, which needs CORS on `/device/v1`, `/media`
and `/content` for that one origin. The player gets its API base from a build-time `VITE_API_BASE`; it's empty in
the browser build, which keeps same-origin behaviour.

### D3. Bridge shape

`ProyectaShell` is added with `addJavascriptInterface`. It has:

- `hardwareId(): String`, returning `ANDROID_ID`
- `shell(): String`, always `"ANDROID"`
- `version(): String`
- `info(): String`: JSON with `deviceModel`, `osVersion`, `cpuCores` and `webviewVersion`
- `metrics(): String`: JSON with `memoryUsedMb`/`memoryTotalMb` from `ActivityManager.MemoryInfo`,
  `diskUsedMb`/`diskTotalMb` from `StatFs(filesDir)`, and `cpuPercent` with `cpuScope:"process"` from
  `/proc/self/stat` deltas

The bridge returns JSON strings because `@JavascriptInterface` only passes primitives. The player parses each one
with a Zod schema in common (`shellInfoSchema`, `shellMetricsSchema`); an invalid payload is ignored.

### D4. Kiosk: a separate Go helper process

`proyecta-helper` runs as a single static Go binary, as a systemd service on Linux and a Windows service on Windows.
It binds `127.0.0.1:47800` and serves:

- `/`: the player's `dist/`, from disk
- `/shell/info` and `/shell/metrics`: the same JSON shapes as D3. On Linux these come from `/proc/meminfo`,
  `/proc/stat` (`cpuScope:"system"`) and `statfs`; on Windows from `GlobalMemoryStatusEx`, `GetSystemTimes` and
  `GetDiskFreeSpaceEx`.
- `/device`, `/media`, `/content`: reverse-proxied to the configured API. The player stays same-origin, so there's
  no CORS and no change to the player's URLs.

The browser launches `http://127.0.0.1:47800/`. The helper doesn't play media and adds no logic to the API calls.
It only proxies them, so the player remains the only protocol client.

*Alternatives:*

- **Node single-executable app.** 50–90 MB, and it needs a Node build per target.
- **Scripts that pass `?hw=` plus a static file server.** No live metrics, and Windows would need its own server
  anyway.
- **A Chromium extension.** It would need a native-messaging host, which is still a second process, and Edge policy
  gets in the way.

Go cross-compiles to linux/amd64, linux/arm64 and windows/amd64 from CI with no toolchain on the target.

### D5. One source of shell info in the player

A new `packages/player/src/shellInfo.ts` resolves `{ shell, version, info, metrics() }`:

1. `window.ProyectaShell` if present.
2. Otherwise `GET /shell/info`, with a 500 ms timeout, once at boot.
3. Otherwise browser APIs: `hardwareConcurrency`, `deviceMemory` → `deviceMemoryApproxGb`, and
   `userAgentData.getHighEntropyValues(['model','platformVersion'])` where supported.

`resolveHardwareId` also reads `hwId` from the helper's `/shell/info`. The Linux/Windows id isn't put in the URL any
more, but `?hw=` stays accepted.

`sendHeartbeat` then sends shell figures when there's a shell, and only `cpuCores`, `deviceMemoryApproxGb`,
`storage*` and `jsHeapUsedMb` in a plain browser. The `memory*` fields are sent only from a shell.

### D6. Reaching older engines

- `@vitejs/plugin-legacy` builds a modern bundle plus a SystemJS/polyfilled legacy one, and the page picks one at
  runtime.
- The shell floor lives in one constant (`MIN_WEBVIEW_MAJOR`), which the Android shell checks against
  `WebView.getCurrentWebViewPackage()` (API 26+) or the WebView UA (API 21–25).
- The legacy target and `MIN_WEBVIEW_MAJOR` are set from the device spike (task group 1). Until then the working
  value is 69 (Android 5–7 era updatable WebViews), to be revised.
- The CLAUDE.md "Chromium 108" note is replaced by the measured floor.

### D7. Offline rotation and media in the player

The player keeps the last rotation JSON in localStorage and caches each rendition it plays in **Cache Storage**
(`proyecta-media-v1`). Each file is downloaded before it plays and always plays from a local blob URL, so losing the
network mid-session never blacks out a slot. The network URL is used only when a file can't be cached (no Cache
Storage, or the download failed). The cost is that a newly linked screen starts once its first files have downloaded,
not while they stream. That's the usual trade-off for signage. On the Android shell it also avoids the WebView
upgrading `http://` media on the `https://` asset origin (seen with a local dev API).
Once a new rotation's media is fully cached, entries that aren't in it are evicted. At boot with no network, the player
starts from the stored rotation.

- **Cache Storage, not OPFS.** It's available from Chromium 40, so it survives D6's lower floor. OPFS needs 86+, and
  sync access 108+.
- **The player owns this, not the shells.** It works the same in every shell and in the browser, and the helper
  doesn't grow state.

### D8. API guard for old RAM figures

In `createRecordHeartbeat`, when `shellVersion` is absent, the function removes `memoryUsedMb`/`memoryTotalMb`
before it persists `Device.health`. Only shells send `shellVersion`, so this one check covers both browser players
and pre-shell players, with no extra database read for the device's shell. Nothing is migrated: the next
heartbeat overwrites stale JSON, and until then the dashboard renders stored health through the same rule.

### D9. Dashboard copy

`DevicePanel.tsx` gets a `missingReason(shell, health, field)`, which returns `browser`, `unmeasured` or `noData`
and maps to the new message ids. The player-type label comes from `DeviceShell`. Nothing here is designed in Pencil:
the dashboard is functional-only.

### D10. Unsupported screen

A WebView too old to run the player can still render a plain static page. So the screen is
`packages/player/unsupported.html`, a second Vite page built into the same `dist/`, following the Pencil frame
`player-unsupported` (1600×900, same tokens as `player-pairing`). It avoids anything an old engine lacks: no module
script, no custom properties, no `min()`. It sizes in `vw`, reuses the self-hosted fonts, and fills in both versions
from `?installed=&required=` with an ES5 inline script. The Android shell loads it through the same asset loader.
If the WebView can't be created at all, the shell falls back to a plain native text view with the same copy.

*Alternative:* a native Android layout. It would need TTF copies of the fonts in `res/font` (fontsource ships only
woff/woff2) and a second implementation of the frame.

### D11. Packaging and release

- **Android:** `shells/android` Gradle, release APK signed with a key from CI secrets. The same key must be kept
  forever, because `ANDROID_ID` is scoped to the signing key: changing the key changes every device's code.
- **Linux:** `nfpm` builds `proyecta-kiosk_<ver>_{amd64,arm64}.deb`. It contains the helper, player `dist/`, the
  `proyecta-helper.service` and `proyecta-kiosk.service` units (the latter runs `cage -- chromium --kiosk
  --autoplay-policy=no-user-gesture-required http://127.0.0.1:47800/`, `After=`/`Requires=` the helper), and a
  `proyecta` user. It depends on `chromium | chromium-browser` and `cage`.
- **Windows:** Inno Setup builds `ProyectaKiosk-<ver>.exe`. It registers the helper service and a logon task that
  starts `msedge --kiosk http://127.0.0.1:47800/ --edge-kiosk-type=fullscreen`.
- The shell version is the repo's release-please version, so `shellVersion` matches the release tag.
- A `shells` job in `release.yml` builds everything on the release tag and uploads it to the GitHub release.

## Risks / Trade-offs

- [ANDROID_ID changes if the APK signing key changes] → The release key lives in CI secrets with an offline backup,
  and PENDING.md records it.
- [Old players keep sending the JS heap as RAM] → D8 removes it on the server.
- [WebView reaching `/device/v1` cross-origin] → CORS on `/device/v1`, `/media` and `/content`, for the
  `appassets.androidplatform.net` origin only. It's additive and doesn't change the contract.
- [Blob URLs for large videos use memory on low-RAM boxes] → Chromium keeps large blobs on disk. The spike measures
  the peak on a 1 GB box. Fallback: on Android, serve cached media through `shouldInterceptRequest` instead of blob
  URLs.
- [Some boxes block HOME replacement or kill background apps] → The BOOT_COMPLETED launch covers most of them, and
  the spike records per-model quirks in the shell README.
- [A new player version needs a reinstall] → Accepted for v0 (a non-goal), and noted in the release notes.
- [A second language in the repo (Go, Kotlin)] → Both stay outside npm workspaces, each with its own README and CI
  job. Lint, typecheck and test for the TS packages don't change.

## Migration Plan

1. Ship the protocol, API guard, player and dashboard first. They're additive and safe for players in the field.
2. Publish the shell installers with the same release.
3. Production: add CORS for the WebView origin (config), and store the Android signing key (PENDING.md).
4. Rollback: players in the field keep working, and the shells can be uninstalled. A device keeps its code only if
   the hardware id stays the same.

## Open Questions

- **Auto-update (follow-up change).** In v0 a new player or shell version means installing a new build. The next
  step is self-updating: each shell checks the latest GitHub release, downloads the new installer or player bundle,
  verifies it, swaps it in and keeps the previous one to fall back to. Owners should also be able to trigger or
  schedule an update per screen from the dashboard, which fits the protocol as an additive device event (e.g.
  `update.available`). Android can't silently install a sideloaded APK without device-owner rights, so there the
  realistic path is updating the bundled player rather than the APK.

- The measured WebView floor (from the spike). Until it's measured, the working value is 69.
- The Windows service wrapper: a native Go `svc` package vs NSSM. The native package is preferred.
- Whether the Linux `.deb` targets only Debian 12 / Ubuntu 22.04+ and Raspberry Pi OS (arm64).

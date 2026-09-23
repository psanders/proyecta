## Why

Today the player runs only as a plain browser tab. It invents its own hardware id, which a storage clear wipes. It
can't boot without a network. And it reports figures that look like hardware data but aren't: the tab's JavaScript
heap is shown as "Memory (RAM)" and the origin's cache quota as "Storage". Valleros need a player they can install on
the Android boxes, TVs and PCs they already own. That player has to survive power cuts and reboots, keep its code,
and report health figures an owner can trust. This is the last v0 change.

## What Changes

- **Android shell** (`shells/android`, Kotlin, WebView):
  - One full-screen app that bundles the player's assets, so it plays offline from a cold boot.
  - Starts on boot, keeps the screen on, and recovers when the WebView renderer crashes.
  - Exposes `ANDROID_ID` and device metrics to the player through a `ProyectaShell` bridge.
  - Shows a branded "not supported" screen when the device's WebView is too old.
  - minSdk 21. Distributed as a sideloadable APK.
- **Kiosk shells** (`shells/kiosk`), each machine running two processes:
  - The browser (Chromium under cage/systemd on Linux, Edge on Windows) runs the player.
  - A separate local helper, `proyecta-helper` (Go), listens on 127.0.0.1. It serves the player's assets from disk,
    for offline boot, and answers `/shell/info` and `/shell/metrics`. It never plays media and never calls the API.
- **One installer per platform:** an APK, a `.deb` (amd64/arm64) and a Windows installer. Each bundles the player's
  assets and, on kiosks, the helper. CI attaches them to the GitHub release.
- **Hardware metrics with exact meanings:**
  - The player gets its figures from, in order: the shell bridge, the local helper, then browser APIs.
  - It sends only figures whose meaning is exact. It stops reporting the JS heap as RAM, and reports the heap
    separately as `jsHeapUsedMb`.
- **Additive heartbeat fields** on `/device/v1`: `shellVersion`, `deviceModel`, `osVersion`, `cpuCores`,
  `deviceMemoryApproxGb`, `diskUsedMb`, `diskTotalMb`, `jsHeapUsedMb`, `cpuScope`.
  - `memoryUsedMb`/`memoryTotalMb` now mean device RAM, reported by a shell only.
  - `storageUsedMb`/`storageQuotaMb` now mean the player's cache.
  - The API drops RAM figures from browser players and from older players that don't send `shellVersion`.
- **Dashboard screen detail:**
  - Shows the player type, shell version and device model.
  - Explains why a figure is missing, in three cases: "Requiere la app Proyecta" (browser), "No disponible en este
    equipo" (a shell that can't measure it) and "Sin datos todavía" (no heartbeat yet).
- **Wider reach:** the player gets a legacy build so it runs on older Chromium/WebView engines. The exact minimum is
  set from a device spike, and the provisional Chromium 108 note is replaced with the measured value.

## Capabilities

### New Capabilities

- `player-shells`: how native shells host the player. Covers:
  - cold boot to playback without a network
  - the hardware id each shell provides
  - the shell ↔ player info/metrics contract (bridge and local helper)
  - start on boot and crash recovery
  - the unsupported-engine screen
  - one installer per platform

### Modified Capabilities

- `device-sync`: the "Heartbeat and health" requirement defines what each health figure means and where it may come
  from. It adds the new optional fields. It says how the screen detail shows a missing figure, depending on the
  player type.

## Impact

- `packages/common/src/schemas/deviceProtocol.schema.ts`: new optional heartbeat fields. Additive, backward
  compatible.
- `packages/api`: a heartbeat guard that drops RAM figures from browser players and from pre-shell players. No
  migration: health is already JSON in `Device.health`.
- `packages/player`:
  - new `shellInfo.ts`
  - `main.ts` heartbeat and `shell()`
  - `hardwareId.ts` reads the helper
  - `@vitejs/plugin-legacy`, plus storage fallbacks where OPFS is missing
- `packages/dashboard`: `DevicePanel.tsx` and new message ids in `messages/{es,en}.ts`.
- `shells/android`: a new Gradle project. `shells/kiosk`: the Go helper, systemd units, packaging scripts and the
  Windows installer.
- `design/pencil.pen`: new `player-unsupported` frame.
- CI: build and attach the shell artifacts in `.github/workflows/release.yml`. New toolchains in CI: JDK/Android
  SDK and Go.
- CLAUDE.md: update the player engine minimum and the `shells/kiosk` description.

## Non-goals

- Advertiser screens, pricing, scheduling/dayparts (v0 exclusions).
- Updating player bundles in place (shells downloading new signed player builds). In v0 a new player version ships as
  a new installer.
- Play Store / Microsoft Store listings.
- A native (non-WebView) fallback player, or bundling our own browser engine (GeckoView, Crosswalk).
- Remote control of devices (reboot, screenshot, shell commands).
- System-wide CPU load on Android, which the platform blocks for apps since Android 8.

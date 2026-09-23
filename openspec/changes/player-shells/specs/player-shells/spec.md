## ADDED Requirements

### Requirement: Offline cold boot

A player installed through a native shell SHALL load from assets stored on the device, not from the network. After a
power cycle with no network, it SHALL either show its last known pairing code or keep playing its last rotation from
local media. It SHALL never show a browser or WebView error page.

#### Scenario: Linked player boots offline

- **WHEN** a linked player with a downloaded rotation restarts with no network
- **THEN** it resumes playing that rotation

#### Scenario: Unlinked player boots offline

- **WHEN** a registered but unlinked player restarts with no network
- **THEN** it shows its pairing code and no error page

### Requirement: Shell hardware id

Each shell SHALL give the player a stable hardware id: `ANDROID_ID` on Android, `/etc/machine-id` on Linux and
`MachineGuid` on Windows. Reinstalling the shell SHALL keep the same hardware id, and so the same pairing code. The
player SHALL prefer the shell's id over a `?hw=` parameter, and either one over the id the browser generates.

#### Scenario: Reinstall keeps the code

- **WHEN** the Android shell is uninstalled and installed again on the same device
- **THEN** the player shows the same pairing code as before

### Requirement: Shell info and metrics contract

A shell SHALL tell the player its type (`ANDROID`, `KIOSK_LINUX` or `KIOSK_WINDOWS`), its version, the device model,
the OS version and the number of CPU cores. When it can measure them, it SHALL also report RAM, disk and CPU load.

- The Android shell SHALL expose these through a `ProyectaShell` JavaScript bridge.
- Kiosk shells SHALL expose them from a local helper on the same origin as the player, as JSON at `GET /shell/info`
  and `GET /shell/metrics`.

The player SHALL read them from the bridge first, then the local helper, then browser APIs. When neither shell
source answers, it SHALL report shell type `BROWSER`.

#### Scenario: Android bridge present

- **WHEN** the player runs inside the Android shell
- **THEN** its heartbeat reports shell `ANDROID`, the shell version and the device's RAM

#### Scenario: Kiosk helper present

- **WHEN** the player is served by the kiosk helper
- **THEN** its heartbeat reports shell `KIOSK_LINUX` or `KIOSK_WINDOWS` with figures from `/shell/metrics`

#### Scenario: Plain browser

- **WHEN** the player runs in a plain browser
- **THEN** its heartbeat reports shell `BROWSER` and no RAM or disk figures

### Requirement: Kiosk helper process

On Linux and Windows kiosks, a helper process separate from the browser SHALL serve the player and the shell
endpoints. It SHALL listen only on the loopback interface. The helper SHALL NOT play media and SHALL NOT call the
Proyecta API. It SHALL start before the browser. If the helper stops, a player that is already loaded SHALL keep
playing, and the system SHALL restart the helper.

#### Scenario: Helper not reachable from the network

- **WHEN** another machine on the LAN connects to the kiosk's helper port
- **THEN** the connection is refused

#### Scenario: Helper crash

- **WHEN** the helper process is killed during playback
- **THEN** playback continues and the helper is running again within 10 seconds

### Requirement: Always-on playback

A shell SHALL start the player when the device boots and keep the display awake. It SHALL let muted video autoplay
without a user gesture, and hide the system UI. The Android shell SHALL be selectable as the home app. If the
WebView's renderer process dies, the shell SHALL recreate it and reload the player without anyone touching the
device.

#### Scenario: Boot starts the player

- **WHEN** the device powers on
- **THEN** the player is on screen without anyone touching the device

#### Scenario: Renderer crash

- **WHEN** the Android WebView renderer is killed
- **THEN** the player is back on screen within 15 seconds

### Requirement: Unsupported engine

The Android shell SHALL check the device's WebView version before loading the player. If the version is below the
supported minimum, it SHALL show a Proyecta-branded "not supported" screen in Spanish instead of a blank or broken
player. The screen SHALL name both the installed WebView version and the required one.

#### Scenario: WebView too old

- **WHEN** the shell starts on a device whose WebView is older than the supported minimum
- **THEN** it shows the "not supported" screen with both versions and doesn't load the player

### Requirement: One installer per platform

Each platform SHALL ship as a single installer: an APK for Android, a `.deb` for Linux (amd64 and arm64) and an
installer for Windows. The kiosk installers SHALL include the helper and set up start-on-boot, so no second download
is required. The installers SHALL be attached to every GitHub release. The shell's version SHALL be the version it
reports as `shellVersion`.

Every release's installers SHALL also be published to the Proyecta downloads store at
`https://api.proyecta.do/downloads/v<version>/`, where they stay available after later releases. The store SHALL
serve `latest.json`, which lists the newest version, its publication time and each file's platform, architecture,
name, relative URL, size in bytes and SHA-256. `latest.json` SHALL change only after all of that version's files are
in place, so it never points at a missing file.

#### Scenario: Linux install

- **WHEN** the `.deb` is installed on a supported Debian-based machine and the machine reboots
- **THEN** the helper is running and the player is on screen in kiosk mode

#### Scenario: Release artifacts

- **WHEN** a release is published
- **THEN** the release has the APK, both `.deb` files and the Windows installer attached

#### Scenario: Downloads store

- **WHEN** version 0.9.0 is released
- **THEN** `https://api.proyecta.do/downloads/latest.json` names version 0.9.0, and every file it lists downloads
  from `https://api.proyecta.do/downloads/v0.9.0/` with the listed size and SHA-256

#### Scenario: Older versions stay available

- **WHEN** version 0.9.1 is released after 0.9.0
- **THEN** `latest.json` names 0.9.1 and the 0.9.0 files still download

### Requirement: Download page

The marketing site SHALL have a download page at `/download`. It SHALL offer one card per platform (Android;
Linux x64 and ARM64; Windows), each with a download button, the file name and its size. It SHALL show the latest
version and its release date, read from the downloads store's `latest.json` when the page loads, so publishing a
release updates the page without redeploying it. If `latest.json` can't be read, the page SHALL hide the version
and point every button to the latest GitHub release instead of showing broken links. After the cards, the page SHALL
point owners to link their screen in the dashboard and offer a way to contact Proyecta. All copy SHALL be Spanish.

#### Scenario: Latest version shown

- **WHEN** `latest.json` names version 0.9.0 released on 2026-09-23
- **THEN** the page shows "v0.9.0 · 23 sep 2026" and the Android button downloads that version's APK

#### Scenario: Downloads store unreachable

- **WHEN** `latest.json` fails to load
- **THEN** no version is shown and every download button links to the latest GitHub release

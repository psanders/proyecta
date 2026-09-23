# Proyecta Android shell (Kotlin)

A single full-screen WebView app that turns an Android TV box, TV or tablet into a Proyecta screen.
It bundles the web player (`packages/player`) inside the APK, so it boots and plays with no
network. Gradle project, outside npm workspaces.

## What it does

- **Loads the player from the APK.** `WebViewAssetLoader` serves `dist/` at
  `https://appassets.androidplatform.net/`. The player calls the API at `proyectaApiBase`
  (`https://api.proyecta.do` by default), which allows CORS for exactly that origin
  (`packages/api/src/device/shellCors.ts`).
- **Tells the player about the device** through `window.ProyectaShell` (`ShellBridge.kt`):
  - `hardwareId()`: `ANDROID_ID`, the id that keeps the pairing code permanent.
  - `info()`: model, Android version, CPU cores, WebView version.
  - `metrics()`: the device's RAM and disk, and this app's CPU load (`cpuScope: "process"`).
    Android 8+ blocks apps from reading system-wide CPU load.
- **Stays on screen.** Keeps the display awake, hides the system bars, ignores Back, and
  autoplays video without a tap. It can be set as the home app, and it starts on boot.
- **Recovers from renderer crashes.** If the WebView's renderer dies, the app rebuilds it and
  reloads the player (Android 8+; older versions run the renderer in-process).
- **Handles old engines.** If the WebView is older than `MIN_WEBVIEW_MAJOR`
  (`WebViewVersion.kt`, which must match `MIN_CHROMIUM` in `packages/player/vite.config.ts`), it
  shows `unsupported.html` (Pencil frame `player-unsupported`) with both versions instead of the
  player.

## Build and run

Needs JDK 17+ and the Android SDK (`local.properties` → `sdk.dir=…`). The Gradle build runs
`npm run build -w @proyecta/player` itself, so run `npm install` at the repo root first.

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug      # unit tests, lint, debug APK
./gradlew installDebug -PproyectaApiBase=http://10.0.2.2:3000   # emulator against `npm run dev:api`
```

Debug builds allow plain HTTP to `10.0.2.2`/`localhost` and enable Chrome remote debugging
(`chrome://inspect`). Release builds only talk to HTTPS.

## Installing on a screen

Most boxes have no Play Store, so valleros sideload the APK from the GitHub release (download,
allow "unknown sources", install). Then choose **Proyecta** as the home app when Android asks, or
in Settings → Apps → Default apps → Home. On Android 10+ that's also what makes the player start
after a power cut, because background apps may not open activities there.

## The signing key is permanent

`ANDROID_ID` is scoped to the APK's signing key. **If the release key ever changes, every Android
screen gets a new hardware id and so a new pairing code, and has to be linked again.** The
release key lives in the repository secrets (`ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`; see
`.github/workflows/shells.yml`). Keep an offline backup of the keystore and its passwords.

## Device matrix

Filled in by the device spike (`player-shells` task 1.1). It sets `MIN_WEBVIEW_MAJOR`.

| Model     | Android | WebView | Play Store | RAM | Result |
| :-------- | :------ | :------ | :--------- | :-- | :----- |
| _pending_ |         |         |            |     |        |

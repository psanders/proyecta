## MODIFIED Requirements

### Requirement: Heartbeat and health

A device SHALL send a heartbeat about every 60 seconds with its player version, shell, Chromium version, resolution,
current item, chosen codec and uptime. When it can measure them exactly, it SHALL also send the figures below. A
figure SHALL be sent only with the meaning defined here. A figure that only approximates another SHALL never be
reported under that other figure's name. Every figure other than player version and uptime SHALL be optional, so
older players remain valid.

- `shellVersion`, `deviceModel`, `osVersion`: what the native shell and the hardware are. Shells only; `deviceModel`
  MAY come from browser client hints.
- `cpuCores`: logical CPU cores.
- `cpuPercent` with `cpuScope`: CPU load from 0 to 100, either for the whole device (`system`) or for the player
  app's process (`process`). Shells only.
- `memoryUsedMb`, `memoryTotalMb`: the device's RAM. Shells only.
- `deviceMemoryApproxGb`: the browser's approximate RAM bucket, sent when no shell reports RAM.
- `diskUsedMb`, `diskTotalMb`: the storage volume that holds the player's data. Shells only.
- `storageUsedMb`, `storageQuotaMb`: the player's own cache and the quota the engine gives it.
- `jsHeapUsedMb`: the player page's JavaScript heap, for detecting leaks. Never shown as RAM.

The server SHALL discard `memoryUsedMb` and `memoryTotalMb` from any heartbeat that has no `shellVersion`. Only a
native shell sends `shellVersion`, so this covers plain-browser players and players built before this change, which
sent the JavaScript heap under those names.

The screen's detail SHALL show the last heartbeat. With it, the detail SHALL show the player type (Browser,
Android, Linux kiosk, Windows kiosk), and the shell version and device model when they were reported. When the detail
can't show a figure, it SHALL say why:

- "Requiere la app Proyecta" when the player is a plain browser (English: "Requires the Proyecta app").
- "No disponible en este equipo" when a shell didn't report it (English: "Not available on this device").
- "Sin datos todavía" when no heartbeat has arrived yet (English: "No data yet").

#### Scenario: Health visible

- **WHEN** a linked device sends a heartbeat
- **THEN** the screen detail shows the reported version, codec, uptime and last activity

#### Scenario: Shell figures shown

- **WHEN** an Android shell sends a heartbeat with `shellVersion`, `deviceModel`, `memoryUsedMb` and `memoryTotalMb`
- **THEN** the screen detail shows the player type Android, the shell version, the model and the device's RAM use

#### Scenario: Browser player RAM discarded

- **WHEN** a plain-browser player's heartbeat (no `shellVersion`) includes `memoryUsedMb` and `memoryTotalMb`
- **THEN** the heartbeat succeeds and the stored health has no RAM figures

#### Scenario: Pre-shell player RAM discarded

- **WHEN** a heartbeat without `shellVersion` includes `memoryUsedMb` and `memoryTotalMb`
- **THEN** the stored health has no RAM figures

#### Scenario: Browser player explains missing figures

- **WHEN** an owner opens the detail of a screen whose player is a plain browser
- **THEN** the CPU, RAM and disk figures read "Requiere la app Proyecta" instead of a value

#### Scenario: Shell cannot measure a figure

- **WHEN** a shell's heartbeat omits `cpuPercent`
- **THEN** the CPU figure reads "No disponible en este equipo"

#### Scenario: Older player still accepted

- **WHEN** a player built before this change sends a heartbeat with none of the new fields
- **THEN** the heartbeat is accepted

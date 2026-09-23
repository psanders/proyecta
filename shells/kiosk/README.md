# Proyecta kiosk shells (Linux and Windows)

A kiosk is two processes on the same machine:

1. **The browser**: Chromium under [cage](https://github.com/cage-kiosk/cage) on Linux, Microsoft
   Edge on Windows, in kiosk mode. It runs the web player, and only the player plays media.
2. **`proyecta-helper`** (`helper/`, Go): a small background service listening only on
   `127.0.0.1:47800`. It:
   - serves the player's files from disk, so the kiosk boots and plays with no network;
   - answers `GET /shell/info` (hardware id, version, model, OS, cores) and `GET /shell/metrics`
     (the machine's RAM, disk and system-wide CPU load), with the shapes of `shellInfoSchema` and
     `shellMetricsSchema` in `packages/common`;
   - proxies `/device`, `/media` and `/content` to the API, so the player stays same-origin.

   It never plays media and never calls the API on its own. The player still sends every
   heartbeat.

The helper starts first. If it dies, the player that is already loaded keeps playing (its media
is cached on the device) and only live figures pause until systemd or the Windows service manager
restarts it.

The hardware id is `/etc/machine-id` on Linux and `MachineGuid` on Windows, so reinstalling keeps
the same pairing code.

## One installer per platform

| Platform                                           | Installer                                | Contents                                                                   |
| :------------------------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------- |
| Linux (Debian 12+, Ubuntu 22.04+, Raspberry Pi OS) | `proyecta-kiosk_<ver>_{amd64,arm64}.deb` | helper, player, systemd units, kiosk user. Pulls in `chromium` and `cage`. |
| Windows 10/11 x64                                  | `ProyectaKiosk-<ver>.exe`                | helper as a service (restarts on failure), player, Edge kiosk at logon.    |

CI builds them and attaches them to every GitHub release (`.github/workflows/shells.yml`).

### Linux

```sh
sudo apt install ./proyecta-kiosk_0.9.0_amd64.deb
sudo reboot            # the kiosk takes over tty1 on boot
```

Settings live in `/etc/default/proyecta-kiosk`: `PROYECTA_API`, and `PROYECTA_WINDOW=x,y,w,h` to
place the player in a window on an LED-panel PC instead of full screen. After editing, run
`systemctl restart proyecta-helper proyecta-kiosk`.

### Windows

Run `ProyectaKiosk-<ver>.exe` as an administrator, then set the kiosk account to log on
automatically (Settings → Accounts, or `netplwiz`). Edge opens the player full screen at logon.

## Build

```sh
shells/kiosk/build.sh            # helpers for linux/amd64, linux/arm64, windows/amd64 + .debs (needs nfpm)
cd shells/kiosk/helper && go test ./...
```

The Windows installer is compiled on Windows with Inno Setup: `iscc /DVersion=0.9.0
windows\proyecta-kiosk.iss`.

To try the helper on a Mac, run `go run . -root ../../../packages/player/dist -api
http://localhost:3000` and open `http://127.0.0.1:47800/`. On macOS it reports itself as a Linux
kiosk with no machine figures.

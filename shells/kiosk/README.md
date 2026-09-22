# Proyecta kiosk shells

Placeholder. Built in the `player-shells` OpenSpec change:

- **Linux:** Chromium in kiosk mode under systemd + cage, passing `/etc/machine-id` as `?hw=`.
- **Windows:** Microsoft Edge kiosk (Chromium-based), passing `MachineGuid` as `?hw=`.
- **LED PCs:** window position/size flags instead of full-screen kiosk.

## Offline boot

Same requirement as the Android shell: the player's assets are served from local disk, not over
HTTP, and the last rotation survives a restart. A kiosk that boots with no network SHALL keep
playing rather than show the browser's error page — the failure a roadside screen hits whenever
power comes back before connectivity does.

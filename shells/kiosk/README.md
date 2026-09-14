# Proyecta kiosk shells

Placeholder. Built in the `player-shells` OpenSpec change:

- **Linux:** Chromium in kiosk mode under systemd + cage, passing `/etc/machine-id` as `?hw=`.
- **Windows:** Microsoft Edge kiosk (Chromium-based), passing `MachineGuid` as `?hw=`.
- **LED PCs:** window position/size flags instead of full-screen kiosk.

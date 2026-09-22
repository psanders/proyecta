## 1. Design (Pencil)

- [x] 1.1 Design a `screen-replace-player-dialog` frame: the screen being changed, the current player (its code
      and how long since it was last seen), the incoming code, and Cancelar / Reemplazar; verify with screenshots
- [ ] 1.2 Decide how the pairing form shows the conflict before the dialog opens (inline message vs. straight to
      the dialog) and reflect it in the `add-screen` / `screen-detail` frames; verify with screenshots

## 2. API

- [ ] 2.1 Add `replace` (default false) to `linkDeviceSchema` in `@proyecta/common`, plus `apiMessages` ids for the
      screen-already-linked refusal and its details; verify schema unit tests including the default
- [ ] 2.2 Split the conflict in `createLinkDevice`: keep `errors.pairing.alreadyLinked` for a device linked
      elsewhere, and return a distinct screen-already-linked error carrying the current device's code and
      `lastSeenAt`; verify unit tests for both branches
- [ ] 2.3 Implement the replace path — close the open `DeviceBinding` with `unlinkedAt` and create the new one in
      one transaction, then publish `unlinked` to the displaced device and `linked` to the new one; verify unit
      tests for success, for a device that is offline or linked elsewhere, and for a validation failure
- [ ] 2.4 Confirm the partial unique indexes still make the race safe: a concurrent link during a replacement
      leaves exactly one open binding; verify with a unit test that simulates the unique violation

## 3. Dashboard

- [ ] 3.1 Handle the screen-already-linked error in the pairing form by opening the replace dialog with the
      current player's code and last-seen time, localized in `es` and `en`; verify Playwright
- [ ] 3.2 Send `replace: true` on confirmation and refresh the screen so it shows the new device; verify
      Playwright: link a second device to a screen that already has one → confirm → the screen reports the new
      code and the displaced player returns to its own code

## 4. Verification

- [ ] 4.1 Integration test over real HTTP and Postgres: after a replacement, plays reported by both devices that
      started before the change stay attributed to the screen each device was linked to at the time
- [ ] 4.2 Lint, typecheck, unit, integration and e2e green; screenshots of the dialog compared with Pencil

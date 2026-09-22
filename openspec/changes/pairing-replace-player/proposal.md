## Why

An owner holding a valid pairing code cannot put it on a screen that already has a player. `createLinkDevice`
refuses with `errors.pairing.alreadyLinked` ("El reproductor o la pantalla ya tienen un vínculo"), which states a
fact and offers no way forward. Recovery means knowing to open Más acciones → Desvincular reproductor first, then
link again — and nothing in the UI points there.

Reproduced on 2026-09-22 against the local stack. A plain-browser player (no `?hw=`, so `hardwareId.ts` invents
`browser-<uuid>` in localStorage) was linked and playing. Clearing site data made it register as a **new** device
with a **new** permanent code; the screen stayed bound to the old, now-dead device; linking the new code returned
the conflict above.

Two situations reach that dead end, and only one is accidental:

- **A browser player loses its identity** — cleared site data, another browser profile, incognito, or device
  management wiping storage. Bounded: the shells planned in `player-shells` pass stable ids (`ANDROID_ID`,
  `/etc/machine-id`, `MachineGuid`), so this is a plain-browser-player problem. It also lands on the least
  technical valleros, who are the most likely to run the player without a shell.
- **A player box is replaced** — it broke, or it was swapped for better hardware, and the new one should take over
  the same screen. Nothing has gone wrong here at all; this is ordinary operations, and it hits the same wall.

The second case is the stronger reason to do this: it is routine, permanent, and unrelated to any defect.

## What Changes

- **Replace, instead of refuse.** When an admin or owner enters a code for a healthy device and the target screen
  already has an open link, the dashboard SHALL offer to replace the screen's current player rather than failing.
- **The confirmation names what is being replaced** and how long it has been out of contact, so the owner can tell
  "this is the dead box I'm swapping" from "I am about to unplug a screen that is working".
- **Replacing is atomic**: the old link closes and the new one opens together, or neither does.
- The plain refusal stays for the case that is genuinely a mistake: a device that is **already linked to another
  screen**. That device is doing a job somewhere else, and silently stealing it is not a recovery.
- Non-goals: making the browser player's invented hardware id survive a storage clear (it cannot be made
  reliable — any storage reset produces a new identity, by design); changing status derivation; touching
  `/device/v1`.

## Capabilities

### Modified Capabilities

- `device-pairing`: linking to a screen that already has a player becomes an explicit, confirmed replacement
  instead of a hard conflict. Attribution rules are unchanged — the old binding is closed, never rewritten.

## Impact

- `packages/api`: `createLinkDevice` gains a replace path (close the open `DeviceBinding`, open the new one in one
  transaction) and notifies both the displaced and the new device.
- `packages/common`: `linkDeviceSchema` carries an explicit replace intent; new `apiMessages` ids for the
  confirmation and for the unchanged device-already-linked refusal.
- `packages/dashboard`: the pairing form handles the conflict by offering the replacement dialog.
- `design/pencil.pen`: a replace-player dialog frame, before any of the above is built.
- Play history is unaffected: `PlayLog` attribution walks the binding open at `startedAt`, and that continues to
  hold because the displaced binding keeps its `linkedAt` and gains an `unlinkedAt`.

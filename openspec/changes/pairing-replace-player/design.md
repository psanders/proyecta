## Context

`createLinkDevice` (`packages/api/src/api/pairing/createPairingFunctions.ts`) creates a `DeviceBinding` row and
relies on partial unique indexes — at most one open binding per device and per screen — to make concurrent links
safe. A unique violation is translated into `CONFLICT errors.pairing.alreadyLinked`, which is why both "this device
is busy" and "this screen is busy" surface as the same dead end today.

The two cases are not alike. A device already linked to another screen is doing a job somewhere else, and taking it
silently would darken that screen. A screen that already has a player is the case the owner is deliberately trying
to change. Only the second becomes a replacement.

Attribution is the constraint that shapes everything else: `createRecordPlayLogs` resolves a play's screen by
finding the binding whose `linkedAt <= startedAt < unlinkedAt`. Bindings are therefore history, not state, and the
displaced binding must be **closed** with an `unlinkedAt`, never deleted or repointed.

## Decisions

- **The intent is explicit, not inferred.** `linkDeviceSchema` gains a `replace` flag, default false. The server
  never replaces a player because it looked safe to; the caller has to say so. This keeps the safe default for
  every existing caller, including anything scripted against tRPC.

- **Two refusals, two messages.** The device-already-linked refusal keeps today's behaviour and message. The
  screen-already-has-a-player refusal gets its own `apiMessages` id and carries the current device's code and
  `lastSeenAt`, which is what lets the dashboard write "sin conexión desde hace 12 minutos" rather than a generic
  warning. Both stay `CONFLICT`.

- **One transaction.** Closing the old binding and opening the new one run inside a single Prisma transaction, so
  a failure cannot leave the screen with no player or with two. The partial unique index still guards the race:
  if another link lands first, the transaction fails and nothing changes.

- **Both devices are notified.** The displaced device gets `unlinked` and falls back to its pairing screen through
  the path it already has; the new device gets `linked`. Neither needs a protocol change — `/device/v1` is frozen
  and stays untouched.

- **The confirmation is a dialog, not a second page.** The owner is already typing a code into the pairing form;
  the conflict answer turns into a dialog in place. It needs a Pencil frame before implementation, per the
  project's Pencil-first rule.

- **The replaced player is not "unpaired".** It keeps its permanent code and can be linked to another screen
  immediately, which is exactly what happens when a box is moved rather than retired.

## Risks / Trade-offs

- **Replacing a healthy player is destructive and cannot be undone in one click.** Mitigated by naming the current
  player's last-seen time in the confirmation, so "offline for 12 minutes" reads differently from "seen 4 seconds
  ago". Re-linking the displaced device afterwards is manual; that is acceptable because the old code still works.

- **It makes an accidental screen-swap slightly easier**: an owner who picks the wrong screen now gets a dialog
  instead of a wall. The confirmation naming the screen and the current player is the whole defence, so its copy
  matters more than usual.

- **It does not fix the underlying cause for browser players.** A browser player that loses its storage will keep
  producing new identities and new codes; this change only makes the recovery obvious. The real fix is stable
  hardware ids from the shells in `player-shells`, and this change should not be read as a substitute for it.

- **Non-goal worth restating**: status derivation is unchanged. A device that vanishes still reads ONLINE until it
  misses its window (2 minutes to STALE, 10 to OFFLINE). That lag is inherent to heartbeat liveness, not a defect,
  and the confirmation shows the raw last-seen time so the owner is not relying on the badge alone.

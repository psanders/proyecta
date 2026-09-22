## Context

`RESOLUTION_PATTERN` only constrains digit count (2–5 digits per side), so it accepts `10x10` through `99999x99999`.
`screenFieldsSchema.resolution` (`packages/common/src/schemas/screen.schema.ts:136-140`) normalizes the value
(larger dimension first) and pipes it through that pattern — nothing checks magnitude. The pattern is also
duplicated, not shared: `registerDeviceSchema` (`packages/common/src/schemas/device.schema.ts:24-28`) has its own
literal copy of the same regex with literal-English error text, because device-protocol schemas never resolve
`apiMessages` (`packages/common/src/i18n/apiMessages.ts:8`, "Device protocol schemas keep literal English text and
are never resolved"). Any bounds change to the screen side must not touch that duplicate — `/device/v1` is frozen.

Resolution reaches a screen two ways:

1. An owner types or picks it in `ScreenFormPage`, validated by `createScreenSchema` / `updateScreenSchema`.
2. `createLinkDevice` (`packages/api/src/api/pairing/createPairingFunctions.ts:95-101`) auto-fills an **empty**
   screen's resolution from the device it just linked, once, at link time — not at device registration.
   `createRegisterDevice` only ever writes the device's own row.

`MIN_SHORT_SIDE_PX = 480` (`packages/common/src/schemas/asset.schema.ts:32`) is the floor an uploaded asset's
short side must already clear. A screen whose short side is below that can never receive a conforming asset, so
480 is not a new number — it is the number the platform already committed to.

## Decisions

- **Floor: short side ≥ 480px, sourced from `MIN_SHORT_SIDE_PX`, not reinvented.** `resolution.ts` imports
  `MIN_SHORT_SIDE_PX` from `asset.schema.ts` (a one-directional dependency — `asset.schema.ts` does not import
  `resolution.ts`, so no cycle) and re-exports it as `MIN_SCREEN_SHORT_SIDE_PX` for callers that only care about
  screens. A unit test asserts the two stay equal, so a future change to one doesn't silently orphan the other.
  The alternative — picking a fresh screen-specific number — was rejected: there is no second reason for a floor
  to exist other than "the player can't be fed anything shorter."

- **Ceiling: long side ≤ 20,000px.** `UHD_8K`, the top tier `resolutionTier` already names, starts at a short side
  of 4320 (long side 7680 at 16:9). 20,000px is roughly 2.6× that long side — enough headroom for a tiled LED
  ribbon or a very wide multi-panel wall, which is exactly the inventory this platform is built for and must not
  reject. The current de-facto ceiling, 99999 (5 digits), is about 13× that same reference point; nothing in DR
  DOOH inventory research suggests anything near it is real, so treating it as a typo guard rather than a limit is
  the right trade. This is a sanity ceiling, not a technical one — it can move if real inventory ever needs it.

- **Bounds check by parsed dimensions, not by regex.** `RESOLUTION_PATTERN` keeps checking shape (`digits x
  digits`). A new `isResolutionInBounds(value)` helper in `resolution.ts` parses the value (reusing
  `parseResolution`) and checks `Math.min(width, height) >= MIN_SCREEN_SHORT_SIDE_PX && Math.max(width, height) <=
  MAX_SCREEN_LONG_SIDE_PX`. `checkScreen`'s `superRefine` in `screen.schema.ts` calls it after the existing
  pattern check and adds one of two new issues: `validation.resolution.tooSmall` or
  `validation.resolution.tooLarge`, both on the `resolution` field, both added to `apiMessages` in es and en.

- **A device's out-of-range resolution is accepted, just not auto-filled.** Three options were considered:
  - *Reject the device's registration or link* — rejected outright. `/device/v1` is frozen; devices in the field
    update on their own schedule, and a real box reporting a real (if odd) resolution must keep working. Turning
    a sanity check on owner input into a hard failure for hardware self-reports would strand devices for a
    dashboard-side decision they have no way to react to.
  - *Clamp the value to the nearest bound* — rejected. A clamped resolution is a fabricated fact: it would show
    advertisers a `resolutionTier` and manifest dimensions that don't match what the panel actually outputs,
    which is worse than showing nothing.
  - *Accept but don't auto-fill (chosen)* — the link still succeeds, the device still plays, and the screen's
    `resolution` stays `null` exactly as if the device had reported nothing. The owner can still set a resolution
    by hand later; until then the screen falls back to `1920x1080` in `dimensions()`
    (`createScreenRotationLoader.ts:22-26`) like any other screen with no resolution, and reports no
    `resolutionTier`/`aspectRatio` rather than a wrong one. This is the only option that keeps the frozen
    contract frozen and never shows a fabricated number.

- **Existing screens are grandfathered, not backfilled.** A screen already stored with a resolution outside the
  new bounds is left as-is — no migration, no forced re-validation sweep. The bounds are a gate on writes, not an
  invariant enforced on read. The one nuance: `updateScreenSchema` validates whatever `resolution` value the
  dashboard submits, so if `ScreenFormPage` always sends the currently-loaded value back (even when the owner only
  changed, say, the name), a legacy out-of-bounds screen would be blocked from *any* edit until its resolution is
  fixed or cleared. `tasks.md` calls this out explicitly as something to verify/guard in the dashboard (only send
  `resolution` when it was actually touched, or otherwise allow the existing stored value through unchanged) — a
  screen a valero hasn't touched in months should not suddenly need a resolution fix just to rename it.

- **Non-goal: aspect-ratio bounds.** `aspectRatio()` already snaps near-standard ratios to a common label and
  reports anything else as a decimal — that's descriptive, not a gate. Adding a gate would need a defensible range,
  and no DR inventory observed so far justifies one; a wide ribbon or a narrow portrait panel are both plausible
  real screens. Revisit only if real submissions show a pattern worth bounding.

## Risks / Trade-offs

- **20,000px is a judgment call, not a measured limit.** If a real installation ever needs more (unlikely for the
  DR market at v0), the ceiling is a constant, not a protocol commitment — raising it later is a non-breaking,
  additive change.
- **The "existing rows blocked from unrelated edits" nuance depends on dashboard behavior that isn't nailed down
  here.** `tasks.md` treats verifying/fixing this as a first-class task rather than an assumption baked into the
  spec, so it doesn't get discovered as a support ticket after ship.
- **A screen linked to a device with an out-of-range resolution shows no `resolutionTier`/`aspectRatio`,** the
  same as any screen with no resolution set today. That is a known, pre-existing UX gap (resolution is optional
  metadata), not a new one — this change just avoids making it worse with a fabricated number.

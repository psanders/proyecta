## Why

`RESOLUTION_PATTERN` (`packages/common/src/utils/resolution.ts:6`) is `/^\d{2,5}x\d{2,5}$/`. It checks shape, not
size: `10x10` and `99999x99999` both pass. Nothing stops a screen from being created with a resolution nothing can
actually play.

The concrete failure: `MIN_SHORT_SIDE_PX = 480` (`packages/common/src/schemas/asset.schema.ts:32`) already rejects
any uploaded image or video whose short side is under 480px. A screen with a shorter side than that can still be
created, is not flagged by `isScreenComplete`, and appears in the advertiser catalog (`ads.catalog`) with a real
`resolutionTier` and `aspectRatio`. An advertiser can select it and pay for plays that no conforming asset can ever
satisfy on it. Verified by reading both files: `isScreenComplete` checks coordinates, availability and rate, never
resolution, so this passes end to end today.

Resolution is not cosmetic metadata — `createScreenRotationLoader.ts:22` puts it in the manifest as the width and
height the player uses to `pickRendition`, and it drives the `resolutionTier` / `aspectRatio` facets shown to
advertisers (`packages/api/src/api/screens/views.ts:87-89`).

## What Changes

- **A screen's resolution SHALL be bounded, not just shaped.** Short side ≥ 480px (the same floor already applied
  to uploaded ads), long side ≤ 20,000px. Free-form width×height stays exactly as free-form as it is today —
  this is a sanity range, not a preset list.
- **No preset whitelist, ever.** DOOH panels are assembled from LED tiles and routinely land on resolutions like
  `768x384`, `1152x648` or `2048x512` that never match a TV preset. `RESOLUTION_PRESETS` (4 values plus "Otra")
  stays exactly as it is — suggestions only.
- **A device's self-reported resolution is never rejected.** `/device/v1` is frozen; `registerDeviceSchema` keeps
  its own loose, literal-English format check unchanged. What changes is downstream: when `createLinkDevice`
  would auto-fill an empty screen's resolution from the newly linked device, it SHALL skip the auto-fill if that
  resolution falls outside the new bounds, leaving the screen's resolution unset instead of failing the link.
- **Existing screens are not touched.** A screen already stored with an out-of-bounds resolution keeps it; the
  bounds apply going forward, to values an owner or a link actually writes.
- **Non-goal: an aspect-ratio bound.** Recommended against for now — no real DR inventory has been observed to
  need one, and any ratio limit today would be a guess that risks rejecting legitimate long banner or ribbon
  screens.

## Capabilities

### Modified Capabilities

- `screens`: resolution gains a floor and ceiling; an out-of-range value is rejected on create/edit, and a
  device's out-of-range resolution is no longer auto-filled onto a screen.

## Impact

- `packages/common`: `resolution.ts` gains the bounds constants (short-side floor sourced from
  `MIN_SHORT_SIDE_PX`, a new long-side ceiling) and a bounds check; `screen.schema.ts`'s `checkScreen` refinement
  rejects an out-of-bounds resolution; two new `apiMessages` ids (es/en).
- `packages/api`: `createLinkDevice` (`packages/api/src/api/pairing/createPairingFunctions.ts`) skips the
  resolution auto-fill when the device's value is out of bounds; `createRegisterDevice` and `/device/v1` are
  unchanged.
- `packages/dashboard`: `ScreenFormPage` surfaces the two new validation messages in `es`/`en`; no new Pencil
  frame — the resolution field and its inline-error styling already exist, only the copy changes.
- No change to `/device/v1`, `RESOLUTION_PRESETS`, or existing screen rows.

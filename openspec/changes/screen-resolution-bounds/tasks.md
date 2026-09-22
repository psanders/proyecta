## 1. Common

- [ ] 1.1 In `packages/common/src/utils/resolution.ts`, import `MIN_SHORT_SIDE_PX` from `asset.schema.ts` and
      re-export it as `MIN_SCREEN_SHORT_SIDE_PX`; add `MAX_SCREEN_LONG_SIDE_PX = 20_000`; verify a unit test that
      asserts `MIN_SCREEN_SHORT_SIDE_PX === MIN_SHORT_SIDE_PX`
- [ ] 1.2 Add `isResolutionInBounds(value: string | null | undefined): boolean` to `resolution.ts`, using
      `parseResolution` and the two constants; verify unit tests: under floor, over ceiling, exactly on each
      bound (inclusive), unparseable input, `null`/`undefined`
- [ ] 1.3 Add `validation.resolution.tooSmall` and `validation.resolution.tooLarge` to `apiMessages` in `es` and
      `en`; verify the existing `apiMessages` completeness test (all ids present in both languages) still passes
- [ ] 1.4 Wire `isResolutionInBounds` into `checkScreen`'s `superRefine` in `screen.schema.ts`, after the existing
      pattern check, adding the appropriate issue on the `resolution` path; verify unit tests for `createScreenSchema`
      and `updateScreenSchema` covering both new failures and the existing default-validation-failure case

## 2. API

- [ ] 2.1 In `createLinkDevice` (`packages/api/src/api/pairing/createPairingFunctions.ts`), guard the resolution
      auto-fill with `isResolutionInBounds(device.resolution)`; verify unit tests: link succeeds and screen stays
      unset when the device's resolution is out of bounds, and existing in-bounds auto-fill behavior is unchanged
- [ ] 2.2 Confirm `createRegisterDevice` and `registerDeviceSchema` are untouched — no bounds check, no new
      rejection path, `/device/v1` stays frozen; verify by re-running existing device-registration unit tests
      unmodified

## 3. Dashboard

- [ ] 3.1 Add `validation.resolution.tooSmall` / `validation.resolution.tooLarge` copy to
      `packages/dashboard/src/lib/messages/{es,en}.ts`
- [ ] 3.2 Verify `ScreenFormPage`'s custom-resolution field surfaces the new errors inline, same as the existing
      `validation.resolution.format` error
- [ ] 3.3 Check whether saving a screen resends its currently-loaded `resolution` even when unchanged; if so, guard
      it so editing an unrelated field (e.g. renaming) on a screen with a legacy out-of-bounds resolution does not
      get blocked by the new bounds; verify with a Playwright test

## 4. Verification

- [ ] 4.1 Lint, typecheck and unit tests green
- [ ] 4.2 Integration test: a screen created before this change with an out-of-bounds resolution still loads,
      lists and can have unrelated fields edited (per 3.3's guard)
- [ ] 4.3 `openspec validate screen-resolution-bounds` and `npx prettier --check` on the change directory

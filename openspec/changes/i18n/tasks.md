## 1. Design (Pencil)

- [x] 1.1 Merge Idioma and Apariencia into one Preferencias card of setting rows in the `profile` frame (Idioma select "Español" saved to the account; Apariencia per browser); verify with a screenshot

## 2. Common

- [x] 2.1 `languageSchema`, `updateUserLanguageSchema`, `UserSettingsClient`/`UserSettingsRecord`; verify schema tests (incl. rejecting `fr`)
- [x] 2.2 `apiMessages` es/en catalog + `resolveApiMessage`; replace Spanish text in schemas with ids; `ValidationError` resolves to Spanish and keeps `messageId`; remove `*_LABELS` exports; verify unit tests: every id resolves in both languages, unknown text passes through, existing Spanish assertions still pass

## 3. API

- [x] 3.1 Prisma `UserSettings` + migration; verify migration applies on `proyecta` and `proyecta_test`
- [x] 3.2 `createGetUserSettings` and `createUpdateUserLanguage` validated functions; verify unit tests incl. default `es` with no row and the validation-failure case (no upsert)
- [x] 3.3 `DomainError`/`TRPCError` messages become ids; context reads `x-language`; `errorFormatter` localizes message and field errors; verify guard test in English and Spanish, default Spanish without header
- [x] 3.4 `profile.get` returns `language`; `profile.updateLanguage`; verify router test

## 4. Dashboard

- [x] 4.1 `lib/i18n.ts` store + `lib/messages/{es,en}.ts` (en typed against es), `useI18n`, `t(id, vars)`, cache + navigator fallback, `<html lang>`); wire in `main.tsx`; tRPC link sends `x-language`; verify unit tests for initial-language resolution and interpolation
- [x] 4.2 Migrate every component and page from `strings` to `t()`; language-aware `format.ts`; delete `strings.ts`; verify typecheck and existing Spanish e2e unchanged
- [ ] 4.3 `usePreferenceSync` in signed-in shells; Mi perfil Preferencias card with `SettingRow`s for the language select (optimistic, persists) and Apariencia; verify Playwright: switch to English → UI in English → reload and new context sign-in still English → English field error

## 5. Project rules and verification

- [x] 5.1 Update the language rule in `CLAUDE.md` and `openspec/config.yaml`
- [ ] 5.2 English screenshot pass of the main screens for overflow; lint, typecheck, unit, integration and e2e green

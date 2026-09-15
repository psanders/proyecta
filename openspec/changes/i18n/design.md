## Context

Dashboard copy lives in one nested object, `packages/dashboard/src/strings.ts` (~270 lines, a few interpolating
functions). Other Spanish text reaching the user:

- ~50 Zod messages in `@proyecta/common` schemas, returned by the API as `fieldErrors` through
  `ValidationError` → `validate()` → the tRPC `errorFormatter`.
- `DomainError` messages in `packages/api/src/api/**` (~20) and `TRPCError` messages in the guards and routers.
- `format.ts` (plurals, "Todos los días", `es-DO`) and `WEEKDAY_LABELS` / option labels in common.

Identity has no field for a language. QCobro (`../qcobro/mods/webapp`) already ships a per-user es/en console and is
the reference implementation, by the product owner's request.

## Goals / Non-Goals

**Goals:** mirror QCobro's i18n so both products work the same way; English for every dashboard text and every
API message the dashboard shows; the language saved per user.

**Non-Goals:** player, marketing site, `/device/v1`, Identity emails, more languages, translation tooling.

## Decisions

- **Message catalog, as in QCobro**: `packages/dashboard/src/lib/i18n.tsx` exports `messages = { en: {...}, es: {...} }`
  with flat dotted ids (`profile.field.language`), `Language`, `MessageId`, `languages`, `defaultLanguage = "es"`,
  `languageNames` (endonyms), `I18nProvider`, `useI18n()` → `{ language, setLanguage, t }`. `en` is typed against the
  `es` keys so a missing translation fails typecheck. No i18n library (same as QCobro).
  - Small addition over QCobro: `t(id, vars?)` replaces `{name}` placeholders, instead of `.replace()` chains at call
    sites. `strings.ts` functions (`pairingNoticeTitle(code)`) become `{code}` placeholders.
  - `strings.ts` is deleted; `brand` and `copyright` move into the catalog as identical entries.
- **Cache and initial language**: `localStorage["proyecta.language"]`; if absent, `navigator.languages` starting with
  `en` → `en`; else `es`. `setLanguage` writes the cache and sets `document.documentElement.lang`.
- **Persistence, as in QCobro**: Prisma `UserSettings(userRef PK, language default "es", createdAt, updatedAt)`, mapped
  `user_settings`, created lazily. Validated functions `createGetUserSettings(client)` (returns defaults when there is
  no row) and `createUpdateUserLanguage(client, userRef)` (upsert). `languageSchema = z.enum(["es","en"])`,
  `updateUserLanguageSchema`, `UserSettingsClient` live in `@proyecta/common`.
  - `profile.get` returns `{ ref, name, email, language }`; new `profile.updateLanguage` (`protectedProcedure`).
- **Sync, as in QCobro**: `usePreferenceSync()` in `AppLayout` (and any signed-in page outside it, e.g. create-business)
  applies `profile.data.language` when it differs from the active one. Mi perfil updates the profile query cache
  optimistically, calls `setLanguage`, then mutates and invalidates.
- **API messages are message ids resolved on the server** (Proyecta-specific; QCobro's schemas carry no custom text):
  - `@proyecta/common` gains `apiMessages = { es: {...}, en: {...} }` keyed by ids (`validation.email.invalid`,
    `errors.forbidden.admin`, …) and `resolveApiMessage(idOrText, language, vars?)`, which returns the text unchanged
    when it is not a known id (Zod defaults, Identity details).
  - Schemas, `DomainError`s and `TRPCError`s use ids instead of Spanish text. `ValidationError` resolves field
    messages to Spanish at construction, so its `message`, logs and existing tests still read Spanish, and keeps the id
    on each field error (`messageId`) for re-resolution.
  - tRPC `createContext` reads `x-language` (`languageSchema.catch("es")`). The `errorFormatter` re-resolves
    `shape.message` and each field error in `ctx.language`. The dashboard's `httpBatchLink` sends `x-language`; the
    subscription link does not need it (it carries no user-facing errors).
  - Parameterised messages (`max 50 characters`) keep the limit in the id's text (one id per limit), avoiding params
    through Zod.
- **Formatting**: `format.ts` functions take the `t`/language (or a `useFormat()` hook): `Intl.NumberFormat` with
  `es-DO`/`en-US`, plurals via ids (`plays.one`/`plays.other`). Weekday, place type, environment, orientation, screen
  status and role labels move from common's `*_LABELS` exports (used only by the dashboard) to catalog ids such as
  `placeType.MALL`; the exports are removed. `formatTime12` is already language-neutral.
- **Pencil**: the `profile` frame (Mi perfil) gains an **Idioma** card with a select, between Contraseña and
  Apariencia. It is its own card, not part of Apariencia, because the language is saved to the account and applies
  instantly, while Apariencia is per browser. Only Spanish frames are designed; English is a copy concern, not a layout
  one.
- **Project rules**: `CLAUDE.md` "Language" and `openspec/config.yaml` context change to "Spanish by default; the owner
  dashboard also supports English via `lib/i18n.tsx`; player and web stay Spanish".

## Risks / Trade-offs

- [Large mechanical diff touching every dashboard page] → migrate page by page with typecheck on `MessageId`; e2e keeps
  running in Spanish (the default) as a regression net.
- [Long English strings overflow Pencil-sized layouts (buttons, nav rail)] → Playwright screenshot pass in English;
  shorten copy rather than change layout.
- [Identity gRPC `details` are English free text] → passed through unchanged (already the case today); known ones
  (e.g. wrong credentials) are mapped to ids in the domain functions.
- [A message id leaks to the UI if the formatter is bypassed] → `resolveApiMessage` unit test covers every id in both
  languages; `DomainError` construction test asserts ids exist.

## Migration Plan

Additive Prisma migration (`user_settings`); no backfill (missing row = Spanish). Old dashboards without `x-language`
keep receiving Spanish. Rollback: drop the table; the dashboard falls back to its cached language.

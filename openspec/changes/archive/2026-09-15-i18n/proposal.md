## Why

The owner dashboard is Spanish-only, but some owners and team members (foreign-owned media companies, English-speaking
operators) work in English. QCobro already solved this with a per-user console language chosen in Mi perfil; Proyecta
should offer the same so a team can share one business while each person reads the dashboard in their own language.

## What Changes

- The owner dashboard is available in **Spanish (es) and English (en)**. Spanish stays the default.
- **Mi perfil** gets a **Idioma / Language** select (each language listed by its own name: "Español", "English"). The
  change applies immediately, without reloading, and is saved to the user's account.
- The language is stored **per user** in Proyecta (the Identity service is not modified), so it follows the user to any
  browser. The browser caches the last choice so pages render in it before the account loads.
- Before signing in (sign in, sign up, password recovery, invitations) the dashboard uses the language last used in
  that browser, else the browser's preferred language when it is English, else Spanish.
- **API messages follow the language**: validation field errors and permission/domain errors returned by the dashboard
  API come back in the requester's language (Spanish when none is given).
- Dates, relative times, plurals, weekday names, place types and number formatting follow the language; money stays
  `US$`.
- **Replaces the project rule "all user-facing text is Spanish, no i18n library"** for the dashboard: copy moves from
  `strings.ts` to QCobro's library-free message catalog (`lib/i18n.tsx`, message ids, `useI18n()`).

## Non-goals

- The player (screens in public spaces) and the marketing site (proyecta.do) stay Spanish.
- `/device/v1` is untouched (frozen contract).
- Emails sent by Fonoster Identity (invitations, password reset) are not translated.
- A per-business default language, more languages, or a language switch on the sign-in page.
- Advertiser screens, pricing and scheduling remain out of scope for v0.

## Capabilities

### New Capabilities
- `dashboard-language`: supported languages, the Mi perfil language preference (persisted per user), the language used
  before sign in, and API messages in the requester's language.

### Modified Capabilities
- `dashboard-appearance`: Apariencia becomes one row of Mi perfil's Preferencias section, next to Idioma, instead of its
  own section. Behavior is unchanged.

<!-- Specs that say "a Spanish validation error" (accounting, screens, owner-auth) remain true: Spanish is what a
     request without a language gets. The dashboard-language spec states the rule. -->

## Impact

- `packages/common`: `languageSchema` (`es` | `en`), `updateUserLanguageSchema`, `UserSettingsClient`; validation
  messages become message ids resolved from an es/en catalog; weekday/place-type labels move to the catalog.
- `packages/api`: `UserSettings` Prisma model + migration; `createGetUserSettings` / `createUpdateUserLanguage`
  validated functions; `profile.get` returns `language`; `profile.updateLanguage`; tRPC context reads the `x-language`
  header and the error formatter localizes field and domain errors.
- `packages/dashboard`: `lib/i18n.tsx` (es/en messages, `I18nProvider`, `useI18n`), `usePreferenceSync`, every page and
  component moves from `strings` to `t()`, `format.ts` becomes language-aware, the tRPC link sends `x-language`,
  `<html lang>` follows the language; Mi perfil language select.
- `design/pencil.pen`: Mi perfil frame gains the language field.
- `CLAUDE.md` / `openspec/config.yaml`: update the Spanish-only language rule for the dashboard.
- Tests: unit tests for the new validated functions and message resolution; Playwright: switch to English in Mi perfil,
  reload, see English and an English field error.

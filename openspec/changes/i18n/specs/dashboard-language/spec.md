## Purpose

Lets each dashboard user read the owner dashboard, and the messages its API returns, in Spanish or English.

## ADDED Requirements

### Requirement: Supported languages

The owner dashboard SHALL be available in Spanish (`es`) and English (`en`), with Spanish as the default. Every
user-facing text of the dashboard SHALL exist in both languages. Money SHALL be shown as `US$` in both languages;
numbers, dates, relative times, plurals, weekday names and option labels (place type, environment, orientation, roles)
SHALL follow the active language.

#### Scenario: English formatting

- **WHEN** the active language is English and a screen earned 1234.5 US$ from 12 plays, available Monday to Friday
- **THEN** the dashboard shows "US$ 1,234.50", "12 plays" and "Mon–Fri"

#### Scenario: Spanish formatting

- **WHEN** the active language is Spanish for the same screen
- **THEN** the dashboard shows "US$ 1,234.50" with es-DO number formatting, "12 reproducciones" and "Lun–Vie"

### Requirement: Choose a language in Mi perfil

Mi perfil SHALL show a language field listing each supported language by its own name ("Español", "English"), set to
the user's current language. Changing it SHALL switch the whole dashboard to that language immediately, without a
page reload, and SHALL save it to the user's account. Only `es` and `en` SHALL be accepted.

#### Scenario: Switch to English

- **WHEN** a signed-in user selects "English" in Mi perfil
- **THEN** the navigation and the profile page are shown in English right away and reading the profile returns
  language `en`

#### Scenario: Unsupported language

- **WHEN** a request saves the language `fr`
- **THEN** the request fails with a validation error on `language` and the saved language is unchanged

### Requirement: Language is saved per user

The language SHALL be stored per user in Proyecta, independently of the business, once the user chooses one. After sign
in, the dashboard SHALL use the saved language, replacing any language the browser had cached. A user who never chose a
language SHALL keep the browser's language (see Language before sign in). Two members of the same business SHALL be
able to use different languages.

#### Scenario: New device

- **WHEN** a user who saved English signs in on a browser that has never opened Proyecta
- **THEN** the dashboard switches to English once the profile loads

#### Scenario: Never chosen

- **WHEN** a user who never chose a language reads their profile
- **THEN** the profile has no saved language

#### Scenario: Sign up from an English browser

- **WHEN** someone with browser language `en-US` signs up and reaches their first signed-in page
- **THEN** the dashboard stays in English

#### Scenario: Same business, different languages

- **WHEN** the owner uses Spanish and an invited admin of the same business saves English
- **THEN** the owner still sees the dashboard in Spanish

### Requirement: Language before sign in

Pages available without a session (sign in, sign up, password recovery and reset, invitation acceptance) SHALL use the
language last used in that browser; if there is none, English when the browser's preferred language is English;
otherwise Spanish. Signing out SHALL keep the browser's last language.

#### Scenario: Returning visitor

- **WHEN** a user who used English signs out and returns to the sign-in page
- **THEN** the sign-in page is in English

#### Scenario: First visit with an English browser

- **WHEN** someone with browser language `en-US` opens the sign-in page for the first time
- **THEN** the sign-in page is in English

#### Scenario: First visit with another browser language

- **WHEN** someone with browser language `fr-FR` opens the sign-in page for the first time
- **THEN** the sign-in page is in Spanish

### Requirement: API messages in the requester's language

The dashboard API SHALL accept the requester's language in an `x-language` request header (`es` or `en`). Validation
field errors and the permission and domain errors it returns (e.g. not a member, admin required, too many attempts,
person already in the business) SHALL be in that language. A request without the header, or with an unsupported
value, SHALL get Spanish. The dashboard SHALL send its active language on every request. The device protocol
(`/device/v1`) SHALL NOT change.

#### Scenario: English field error

- **WHEN** a request with `x-language: en` signs up with the email "not-an-email"
- **THEN** the response carries a field error on `email` reading "Enter a valid email"

#### Scenario: No language header

- **WHEN** the same request is sent without `x-language`
- **THEN** the field error on `email` reads "Escribe un correo válido"

#### Scenario: English delete confirmation

- **WHEN** an owner using English deletes a business and types "delete" as the confirmation
- **THEN** the confirmation is accepted, as "ELIMINAR" is for Spanish; any other word fails with a validation error

#### Scenario: English permission error

- **WHEN** a member sends `x-language: en` to an admin-only operation
- **THEN** the request fails as forbidden with the message "You need to be an administrator"

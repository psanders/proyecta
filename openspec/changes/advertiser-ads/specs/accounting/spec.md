## MODIFIED Requirements

### Requirement: Billable plays

A play SHALL be billable only when its result is completed; stalled and failed plays SHALL earn nothing. A
billable play's charge SHALL be computed from the ad's planned duration — the duration the device reports having
played, or, when the device doesn't report one, the duration configured for that ad at the moment the play is
recorded — not the measured wall-clock duration of the playback. The planned duration MUST be a positive multiple
of 5000 ms to be used for billing; a completed play whose planned duration fails that check SHALL be stored for
diagnostics but SHALL NOT be billable. Charge = (planned duration in seconds ÷ 5) × the play's snapshotted rate.
A play of an advertiser's ad SHALL be attributed, when it is recorded, to that ad and to the advertiser business. A
play whose advertiser business is the same business that owns the screen (a house play) SHALL be stored and counted
as a play but SHALL NOT be billable, whatever its result and duration. Billing SHALL follow businesses, not people: a
person who belongs to both businesses doesn't make a play a house play.

#### Scenario: Completed play is billed by the duration the device reports

- **WHEN** a device reports a completed play of a 15-second ad, together with that 15000 ms duration, on a screen
  billed at US$ 2 per 5 seconds
- **THEN** the play earns US$ 6 (3 units × US$ 2), regardless of the exact measured playback time

#### Scenario: Rotation changed while the TV was offline

- **WHEN** a device plays an ad it last synced at 15 seconds, then reports that completed play (with its own
  15000 ms duration) after reconnecting to find the rotation has since changed that ad to 10 seconds
- **THEN** the play is billed by the 15 seconds it actually displayed, not by the ad's current configured duration

#### Scenario: Older device omits the duration

- **WHEN** a device that predates this capability reports a completed play without a duration
- **THEN** the platform falls back to the duration configured for that ad in the rotation at the time the play is
  recorded

#### Scenario: Device reports an invalid duration

- **WHEN** a device reports a completed play with a duration that is zero, negative, or not a multiple of 5000 ms
- **THEN** the play is stored but is not billable, and the platform does not fall back to a rotation lookup for it

#### Scenario: Stalled or failed plays earn nothing

- **WHEN** a device reports a stalled or failed play
- **THEN** the play is stored for diagnostics but contributes zero billable seconds and zero earnings

#### Scenario: Own ad on own screen

- **WHEN** a device reports a completed play of an ad whose advertiser business owns the screen, billed at US$ 2 per 5
  seconds
- **THEN** the play is stored as a house play attributed to that ad, and it earns and costs nothing

#### Scenario: Same person, two businesses

- **WHEN** a person belongs to business A, which owns the screen, and to business B, whose ad played on it
- **THEN** the completed play is billable: it is spend for B and earnings for A

### Requirement: Screen earnings summary

The platform SHALL provide, for each screen, a summary of billable plays, billable seconds, and earnings for
today and for the last 7 days (America/Santo_Domingo calendar days), computed from billable plays. The owner-facing
view SHALL lead with the number of billable plays and the earnings in US$ (e.g. "12 reproducciones · US$ 30.00",
singular "1 reproducción" for exactly one); billable seconds MAY be omitted from that view but SHALL remain part of
the underlying data. A screen with no rate SHALL show the summary as unavailable rather than computing earnings of
zero from an undefined rate. Each window SHALL also count completed house plays, shown as a secondary line only when
there are any (e.g. "4 propias (sin costo)", singular "1 propia"), never added to plays or earnings.

#### Scenario: Owner views recent activity

- **WHEN** an owner opens a screen that has played 12 billable ads today and 180 in the last 7 days, billed at
  US$ 2.50 per 5 seconds
- **THEN** they see "Hoy · 12 reproducciones · US$ 30.00" and "Últimos 7 días · 180 reproducciones · US$ 450.00"

#### Scenario: Exactly one billable play

- **WHEN** a screen has exactly one billable play today
- **THEN** the summary reads "1 reproducción", not "1 reproducciones"

#### Scenario: Screen without a rate

- **WHEN** an owner opens a screen that has never had a rate set
- **THEN** the summary explains that no rate is set instead of showing US$ 0

#### Scenario: Screen with house plays

- **WHEN** a screen has 12 billable plays and 4 completed house plays today
- **THEN** today reads "12 reproducciones · US$ 30.00" with a secondary line "4 propias (sin costo)"

## ADDED Requirements

### Requirement: Separate earnings and spend

A business's earnings SHALL be the charges of billable plays on its screens, and its ad spend SHALL be the charges of
billable plays of its ads. Both SHALL be derived from the same recorded plays and SHALL never be offset against each
other, and the dashboard view setting SHALL NOT change either.

#### Scenario: Business that both earns and spends

- **WHEN** business A earns US$ 100 from other businesses' ads on its screens and spends US$ 60 on its ads on other
  businesses' screens
- **THEN** its screens report US$ 100 earned and its ads report US$ 60 spent, with no netted balance

# ads Specification

## Purpose

Lets a business advertise: find screens, create an ad from one of its files for a set of screens and dates, and
follow where each ad is waiting for approval, scheduled, on air or finished, with its plays and spend.

## Requirements

### Requirement: Screen catalog

Every member SHALL browse a catalog of screens from all businesses that are active, not deleted and complete (days,
hours and a rate set), showing name, city, place type, orientation, resolution, available days and hours, and the rate
per 5 seconds in US$. The catalog SHALL filter by city and place type. Screens of the member's own business SHALL be
marked as theirs ("Tuya · sin costo"). Archived, deleted and incomplete screens SHALL never be listed.

#### Scenario: Browse by city

- **WHEN** a member filters the catalog by Santiago
- **THEN** only complete, active screens in Santiago are listed, each with its rate

#### Scenario: Incomplete screen

- **WHEN** a business has a screen without a rate
- **THEN** that screen doesn't appear in anyone's catalog

### Requirement: Create an ad

Admins and owners SHALL create an ad with a name (1–80 characters), one ready asset of their business, a start date and
an end date, and 1 to 50 screens from the catalog. The start date SHALL NOT be before today and the end date SHALL be
on or after the start date and at most 365 days after it, as calendar dates in the business's time zone; the ad runs
from the start of its start date to the end of its end date. Only screens whose orientation matches the asset's (or
that have no orientation set) SHALL be accepted. Members SHALL NOT create ads.

#### Scenario: Create an ad on two screens

- **WHEN** an admin creates "Promo Verano" with a ready landscape video, from June 1 to June 30, on two landscape
  catalog screens
- **THEN** the ad is listed with both screens and its dates

#### Scenario: Portrait file on a landscape screen

- **WHEN** an admin creates an ad with a portrait image on a landscape screen
- **THEN** the request fails saying the screen's orientation doesn't match the file, and no ad is created

#### Scenario: End before start

- **WHEN** an admin creates an ad whose end date is before its start date
- **THEN** the request fails with a validation error on the end date

#### Scenario: File still preparing

- **WHEN** an admin creates an ad with an asset that isn't ready
- **THEN** the request fails saying the file isn't ready yet

### Requirement: Placements and the approval guardrail

Each screen in an ad SHALL have a placement for the ad's current file with a status. A placement on a screen owned by
the advertiser's own business SHALL start approved. A placement on another business's screen SHALL start pending
approval, and a pending placement SHALL NEVER play. Until owner review exists, pending placements SHALL stay pending.

#### Scenario: Own screen plus another business's screen

- **WHEN** a business creates an ad on one of its own screens and on a screen of another business
- **THEN** the own screen is approved and plays the ad within its dates, and the other screen shows "Esperando
  aprobación" and never plays it

### Requirement: Ad and screen status

Each screen of an ad SHALL show: Esperando aprobación (only pending placements), Programado (an approved file, before
the start date), Al aire (an approved file, within the dates), Finalizado (after the end date) or Cancelado. When an
approved file keeps playing while a newer file is pending, the screen SHALL also say the new file is waiting for
approval. Each ad SHALL show one status, taking the first that applies: Cancelado; Finalizado; Al aire (some screen on
air); Programado (some screen approved, before the start date); Esperando aprobación (some screen pending); Sin
pantallas. The ads list SHALL show each ad's status, its dates, its file, and how many of its screens are approved
(e.g. "Al aire en 1 de 2 pantallas").

#### Scenario: Partly approved ad on air

- **WHEN** an ad within its dates has one approved own screen and one pending screen of another business
- **THEN** the ad shows Al aire, "en 1 de 2 pantallas", the own screen shows Al aire and the other shows Esperando
  aprobación

#### Scenario: Scheduled ad

- **WHEN** an ad with an approved screen starts next week
- **THEN** the ad and that screen show Programado

#### Scenario: Ended ad

- **WHEN** an ad's end date has passed
- **THEN** it shows Finalizado and no longer plays anywhere

### Requirement: Change an ad's screens

Admins and owners SHALL add catalog screens to an ad that isn't cancelled or finished (same orientation rule, not
already in the ad), each getting a placement with the initial status rule above. They SHALL remove a screen from such
an ad: its placements are withdrawn, it stops playing there, it disappears from the ad's screens and its past plays
are kept. Adding a removed screen again SHALL be allowed.

#### Scenario: Remove an on-air screen

- **WHEN** an admin removes an own screen where the ad is on air
- **THEN** the screen's player receives an updated rotation without the ad, and the ad's past plays on it still count

#### Scenario: Add a screen twice

- **WHEN** an admin adds a screen that is already in the ad
- **THEN** the request fails saying the screen is already in the ad

### Requirement: Replace an ad's file

Admins and owners SHALL replace the file of an ad that isn't cancelled or finished with another ready asset of the same
orientation. Every screen in the ad SHALL get a placement for the new file with the initial status rule above. Where the
previous file was approved, it SHALL keep playing until the new file is approved on that screen; on own screens the new
file SHALL replace it at once. The ad SHALL show the new file as its current file.

#### Scenario: Replace on an own screen

- **WHEN** an admin replaces the file of an ad on air on an own screen
- **THEN** that screen's player receives a rotation with the new file

#### Scenario: Replace on another business's screen

- **WHEN** an admin replaces the file of an ad whose other-business screen is still pending
- **THEN** that screen stays Esperando aprobación for the new file and never plays either file

#### Scenario: Different orientation

- **WHEN** an admin replaces a landscape file with a portrait one
- **THEN** the request fails saying the orientation must match

### Requirement: Cancel an ad

Admins and owners SHALL cancel an ad that isn't finished. Cancelling SHALL stop it on every screen at once and keep its
screens and history; a cancelled ad SHALL NOT be changed again.

#### Scenario: Cancel an on-air ad

- **WHEN** an admin cancels an ad on air on an own screen
- **THEN** the ad shows Cancelado and the screen's player receives a rotation without it

#### Scenario: Change a cancelled ad

- **WHEN** an admin adds a screen to a cancelled ad
- **THEN** the request fails saying the ad was cancelled

### Requirement: Ads belong to their business

Ads SHALL be visible and changeable only within the business that created them; every member SHALL view them. An ad's
advertiser name SHALL be the business's name when the ad was created.

#### Scenario: Another business's ad

- **WHEN** a member requests an ad that belongs to a different business
- **THEN** the request fails as not found

### Requirement: Plays and spend per ad

An ad's detail SHALL show, for the ad and for each of its screens, the number of completed plays and the spend in US$
computed from billable plays, and SHALL count plays on own screens separately as "propias (sin costo)".

#### Scenario: Ad with paid and house plays

- **WHEN** an ad has 10 completed plays on another business's screen at US$ 2.00 per 5 s for a 15-second file and 4 on
  an own screen
- **THEN** the ad shows 14 plays, US$ 60.00 spent and "4 propias (sin costo)"

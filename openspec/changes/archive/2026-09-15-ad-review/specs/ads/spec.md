## MODIFIED Requirements

### Requirement: Placements and the approval guardrail

Each screen in an ad SHALL have a placement for the ad's current file with a status. A placement on a screen owned by
the advertiser's own business SHALL start approved. A placement on another business's screen SHALL start approved when
that owner already approved the same file on that screen and never stopped it; otherwise it SHALL start pending
approval until the owner decides, and a pending placement SHALL NEVER play.

#### Scenario: Own screen plus another business's screen

- **WHEN** a business creates an ad on one of its own screens and on a screen of another business
- **THEN** the own screen is approved and plays the ad within its dates, and the other screen shows "Esperando
  aprobación" and never plays it

#### Scenario: Owner approves

- **WHEN** the owner of that other screen approves the request
- **THEN** the screen shows Al aire (or Programado) for the advertiser and its player plays the ad within its dates

### Requirement: Ad and screen status

Each screen of an ad SHALL show: Esperando aprobación (only pending placements), Programado (an approved file, before
the start date), Al aire (an approved file, within the dates), Rechazado (the owner rejected the file, with the reason
and note), Detenido por el vallero (the owner stopped it, with the note), Sin respuesta (still pending when the ad
ended), Finalizado (approved and the end date has passed) or Cancelado. When an approved file keeps playing while a
newer file is pending, the screen SHALL also say the new file is waiting for approval. Each ad SHALL show one status,
taking the first that applies: Cancelado; Finalizado; Al aire (some screen on air); Programado (some screen approved,
before the start date); Esperando aprobación (some screen pending); Requiere atención (some screen rejected, stopped or
without response); Sin pantallas. The ads list SHALL show each ad's status, its dates, its file, and how many of its
screens are approved (e.g. "Al aire en 1 de 2 pantallas").

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

#### Scenario: Rejected everywhere

- **WHEN** the only screen of an ad is rejected as "Baja calidad" with the note "Se ve pixelado"
- **THEN** the ad shows Requiere atención and the screen shows Rechazado with "Baja calidad" and "Se ve pixelado"

#### Scenario: Stopped by the owner

- **WHEN** an owner stops an ad on their screen
- **THEN** the advertiser sees that screen as Detenido por el vallero

#### Scenario: No response

- **WHEN** an ad ends with a screen of another business still pending
- **THEN** the advertiser sees that screen as Sin respuesta

### Requirement: Change an ad's screens

Admins and owners SHALL add catalog screens to an ad that isn't cancelled or finished (same orientation rule, not
already in the ad), each getting a placement with the initial status rule above. They SHALL remove a screen from such
an ad: its pending and approved placements are withdrawn, it stops playing there, it disappears from the ad's screens
and its past plays are kept; rejected and stopped placements stay on record. Adding a removed screen again SHALL be
allowed, and a screen whose placements were all rejected or stopped SHALL count as not in the ad for adding.

#### Scenario: Remove an on-air screen

- **WHEN** an admin removes an own screen where the ad is on air
- **THEN** the screen's player receives an updated rotation without the ad, and the ad's past plays on it still count

#### Scenario: Add a screen twice

- **WHEN** an admin adds a screen that is already in the ad
- **THEN** the request fails saying the screen is already in the ad

#### Scenario: Ask a rejecting owner again

- **WHEN** an advertiser adds back a screen whose owner rejected the ad's file
- **THEN** the screen gets a new pending placement and the owner sees a new pending request

## Purpose

Lets a screen owner decide which other businesses' ads play on its screens — approve per screen, reject with a reason,
or stop an approved ad — and keeps the decisions on record so advertisers get a clear answer and owners aren't asked twice.

## ADDED Requirements

### Requirement: Requests inbox

Every member SHALL see the requests of their business: one request per ad of another business that has placements on
the business's screens. Each request SHALL show the ad name, the advertiser name, the file (kind, duration, orientation
and a preview), the dates, and each of the business's screens in the ad with its rate and status for that screen
(pending, approved, rejected, stopped, or no response). Requests with at least one pending placement on a screen, for an
ad that isn't cancelled and hasn't ended, SHALL be listed under Pendientes, soonest start first; every other request
SHALL be listed under Revisadas, newest first. Ads of the business itself SHALL never appear, and a business SHALL never
see another business's screens or placements through a request.

#### Scenario: New request

- **WHEN** Café Aroma creates an ad on two screens of Vallas del Cibao
- **THEN** Vallas del Cibao sees one pending request for that ad listing both screens as pending

#### Scenario: Own ad

- **WHEN** a business creates an ad only on its own screens
- **THEN** no request appears in its own inbox

#### Scenario: Other screens stay private

- **WHEN** an ad runs on screens of Vallas del Cibao and of Plaza Bella Vista
- **THEN** Vallas del Cibao's request lists only its own screens

### Requirement: Pending count

The dashboard SHALL show the number of pending requests next to Solicitudes in the menu, refreshed at least every 30
seconds and right after the business decides a request, and SHALL hide the count when it is zero.

#### Scenario: Count after approving

- **WHEN** an owner with 2 pending requests approves one
- **THEN** the menu shows 1 next to Solicitudes

### Requirement: Approve a request

Admins and owners SHALL approve a pending request on one or more of its pending screens. The chosen placements SHALL
become approved (recording when and by whom) and play within the ad's dates; the pending placements on the business's
other screens in that request SHALL become rejected with the reason "No es apto para este lugar". Approving SHALL only
act on the ad's current file and SHALL fail when the ad was cancelled or has ended.

#### Scenario: Approve one of two screens

- **WHEN** an admin approves a request on the gym screen and leaves the clinic screen unchecked
- **THEN** the gym screen's player receives the ad in its rotation, the clinic screen is rejected with "No es apto para
  este lugar", and the request moves to Revisadas

#### Scenario: Approve with no screens

- **WHEN** an admin approves a request without choosing any screen
- **THEN** the request fails with a validation error and nothing changes

#### Scenario: Request for a cancelled ad

- **WHEN** an admin approves a request whose ad the advertiser cancelled
- **THEN** the request fails saying the ad was cancelled

### Requirement: Reject a request

Admins and owners SHALL reject all pending placements of a request with one reason: inappropriate content ("Contenido
inapropiado"), a competitor ("Es de la competencia"), not suitable for the place ("No es apto para este lugar"), low
quality ("Baja calidad") or other ("Otro"). A note of up to 280 characters SHALL be optional, and required for "Otro".
The advertiser SHALL see the reason and the note for each rejected screen.

#### Scenario: Reject as competitor

- **WHEN** an owner rejects a request with "Es de la competencia"
- **THEN** every pending screen of the request is rejected, never plays the ad, and the advertiser sees "Es de la
  competencia" on those screens

#### Scenario: Other without a note

- **WHEN** an owner rejects with "Otro" and no note
- **THEN** the request fails with a validation error on the note and nothing changes

### Requirement: Approval reuse

A new placement SHALL start approved without a new request when the same file was already approved on the same screen
and that approval was never stopped — for example another ad with the same file, or a screen added back to the ad. A
file that was rejected or stopped on a screen SHALL be asked again.

#### Scenario: Same file, new ad

- **WHEN** an advertiser creates a second ad with a file the owner already approved on that screen
- **THEN** the placement starts approved and no pending request appears

#### Scenario: Stopped before

- **WHEN** an advertiser creates an ad with a file the owner had stopped on that screen
- **THEN** the placement is pending and a new request appears

### Requirement: Stop an approved ad

Admins and owners SHALL stop an ad on one of their screens where it is approved, from the screen's detail ("Anuncios en
esta pantalla") or from the reviewed request, with an optional note. Its approved and pending placements on that screen
SHALL become stopped: the ad leaves the player's rotation at once, plays already recorded keep their billing, and the
advertiser sees "Detenido por el vallero" with the note.

#### Scenario: Stop from the screen detail

- **WHEN** an owner stops an ad on air on their screen
- **THEN** the screen's player receives a rotation without the ad, and the ad's past plays on that screen still count
  as earnings

#### Scenario: Stop an ad that isn't approved

- **WHEN** an owner stops an ad on a screen where it's only pending
- **THEN** the request fails saying the ad isn't approved on that screen

### Requirement: Ads on a screen

A screen's detail SHALL list the other businesses' ads on it that are pending, scheduled or on air, with the advertiser,
ad name, dates and status, a link to review pending ones and, for admins and owners, a stop action on approved ones.

#### Scenario: Screen with a pending and an approved ad

- **WHEN** an owner opens a screen with one approved ad and one pending ad from other businesses
- **THEN** both are listed, the pending one links to its request and the approved one can be stopped

### Requirement: No response

A pending placement whose ad has ended SHALL show as "Sin respuesta" to the owner and the advertiser, SHALL move its
request to Revisadas, SHALL NOT be approvable and SHALL never play.

#### Scenario: Ad ends while pending

- **WHEN** an ad ends with a screen still pending
- **THEN** the owner's request shows that screen as Sin respuesta under Revisadas and approving it fails because the ad
  has ended

### Requirement: Review permissions

Only admins and owners of the business that owns the screens SHALL approve, reject or stop; members SHALL only view.
Deciding on a request, screen or placement of another business SHALL fail as not found.

#### Scenario: Member approves

- **WHEN** a member (not admin or owner) approves a request
- **THEN** the request fails as forbidden and nothing changes

#### Scenario: Another business's screen

- **WHEN** an admin stops an ad on a screen that belongs to another business
- **THEN** the request fails as not found

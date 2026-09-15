## MODIFIED Requirements

### Requirement: Current state

A device SHALL fetch its current state: whether it is linked, the screen name when linked, and the rotation to
play (versioned). Unlinked devices SHALL receive no rotation. A linked screen's rotation SHALL be its ads that have
an approved placement and are within their dates right now (for each ad and screen, the most recently approved file;
pending, withdrawn and cancelled placements never appear), each item named by the ad's advertiser and title and
carrying the file's duration and renditions. A linked screen with no such ads SHALL receive the default rotation. The
rotation's version SHALL change whenever its items change and SHALL stay the same otherwise. The response shape SHALL
remain the same as before per-screen rotations.

#### Scenario: Linked device polls

- **WHEN** a linked device requests its state
- **THEN** it receives linked, its screen name, and the rotation with a version

#### Scenario: Screen with an approved ad on air

- **WHEN** a device linked to a screen with one approved ad within its dates requests its state
- **THEN** the rotation contains exactly that ad, with its advertiser, duration and renditions

#### Scenario: Pending ad never reaches the device

- **WHEN** a device's screen only has a pending placement for an ad within its dates
- **THEN** its rotation doesn't contain that ad

#### Scenario: No ads on the screen

- **WHEN** a device's screen has no approved ads within their dates
- **THEN** it receives the default rotation

### Requirement: Live events

A device SHALL open a server-sent event stream that immediately delivers the current state and then pushes linked,
unlinked and rotation-updated events as they happen, with keep-alive messages at least every 30 seconds. While the
stream is open the device SHALL count as seen. A rotation-updated event SHALL be pushed to a screen's device whenever
the set of ads it should play changes: an ad placement on it becomes approved or is withdrawn, an ad on it is
cancelled or has its file replaced, or an ad on it reaches its start or passes its end (within about a minute).

#### Scenario: Owner links while the TV waits

- **WHEN** a device's stream is open and an admin links it
- **THEN** the device receives a linked event within 2 seconds

#### Scenario: Ad created on an own screen

- **WHEN** a device's stream is open and its business creates an ad on its screen that is already within its dates
- **THEN** the device receives a rotation-updated event whose rotation contains the ad within 2 seconds

#### Scenario: Ad reaches its end

- **WHEN** an ad on air on a device's screen passes the end of its end date
- **THEN** the device receives a rotation-updated event without that ad within about a minute

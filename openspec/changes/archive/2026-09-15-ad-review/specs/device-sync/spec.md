## MODIFIED Requirements

### Requirement: Live events

A device SHALL open a server-sent event stream that immediately delivers the current state and then pushes linked,
unlinked and rotation-updated events as they happen, with keep-alive messages at least every 30 seconds. While the
stream is open the device SHALL count as seen. A rotation-updated event SHALL be pushed to a screen's device whenever
the set of ads it should play changes: an ad placement on it is approved, stopped or withdrawn, an ad on it is
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

#### Scenario: Owner approves another business's ad

- **WHEN** a device's stream is open and its owner approves another business's ad that is within its dates
- **THEN** the device receives a rotation-updated event whose rotation contains the ad within 2 seconds

#### Scenario: Owner stops an ad

- **WHEN** a device's stream is open and its owner stops an ad on air on its screen
- **THEN** the device receives a rotation-updated event without that ad within 2 seconds

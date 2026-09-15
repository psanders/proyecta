# device-pairing Specification

## Purpose

Connects physical players to screens: a permanent pairing code per device, linking and unlinking by code,
the binding history that keeps plays attributable, and the credential a device uses on the protocol.

## Requirements

### Requirement: Permanent device code

Registering SHALL return the device's pairing code, minted by the server and tied to its hardware id. The same
hardware id SHALL always receive the same code. Codes SHALL be 8 characters from an alphabet without 0, O, 1 and I,
displayed as XXXX-XXXX, and accepted case-insensitively with or without the dash.

#### Scenario: Reinstall

- **WHEN** a device registers again with the same hardware id
- **THEN** it receives the same code as before

### Requirement: Device credential

Registering SHALL also return a device token that authenticates every other device request. Each registration
SHALL issue a new token and invalidate the previous one. Tokens SHALL be stored only as hashes.

#### Scenario: Old token after re-registering

- **WHEN** a device re-registers and then an old token is used
- **THEN** the request with the old token fails as unauthorized

### Requirement: Check a code

Admins and owners SHALL check a code before linking. The answer SHALL say whether a device with that code is
online and available to link, without exposing data from other workspaces.

#### Scenario: Device on and waiting

- **WHEN** an admin checks the code shown on a powered-on, unlinked player
- **THEN** the answer is available

#### Scenario: Unknown or offline

- **WHEN** the code does not exist or the device has not been seen in the last 2 minutes
- **THEN** the answer is not available, with a reason (not found, offline, already linked)

### Requirement: Link a device to a screen

Admins and owners SHALL link a device to an active screen of their workspace by code. Linking SHALL succeed only
if the device was seen within the last 2 minutes and has no open link, and the screen has no open link. Concurrent
attempts for the same device SHALL result in exactly one link. Link attempts SHALL be rate limited per workspace.
On success the device SHALL be notified immediately and start playing.

#### Scenario: Successful link

- **WHEN** an admin links an available device to an unlinked active screen
- **THEN** the screen shows the device and the device receives a linked event with what to play

#### Scenario: Device already linked

- **WHEN** someone tries to link a device that is linked to any screen
- **THEN** the request fails and the existing link is untouched

#### Scenario: Two owners race

- **WHEN** two workspaces link the same available device at the same moment
- **THEN** exactly one link is created

### Requirement: Unlink a device

Admins and owners SHALL unlink a screen's device. Unlinking SHALL close the link (keeping its history), notify the
device, and make both the device and the screen available again. A device that is offline when unlinked SHALL learn
about it when it reconnects. The device SHALL show its same code again.

#### Scenario: Screen moved

- **WHEN** an admin unlinks a device and links it to another screen with the same code
- **THEN** plays before the move are attributed to the first screen and plays after to the second

### Requirement: Attribution by link history

Every play reported by a device SHALL be attributed to the screen the device was linked to when the play started,
using the link history, even if reported later.

#### Scenario: Late upload after unlink

- **WHEN** a device reports plays that started before it was unlinked
- **THEN** those plays are attributed to the screen it was linked to at that time

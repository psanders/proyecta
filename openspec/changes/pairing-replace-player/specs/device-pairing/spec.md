## MODIFIED Requirements

### Requirement: Link a device to a screen

Admins and owners SHALL link a device to an active screen of their workspace by code. Linking SHALL succeed only
if the device was seen within the last 2 minutes and has no open link. When the screen already has an open link,
the request SHALL be refused unless it carries an explicit intent to replace that player (see "Replace a screen's
player"), and the refusal SHALL identify the screen's current player so the caller can decide. Concurrent attempts
for the same device SHALL result in exactly one link. Link attempts SHALL be rate limited per workspace. On success
the device SHALL be notified immediately and start playing.

#### Scenario: Successful link

- **WHEN** an admin links an available device to an unlinked active screen
- **THEN** the screen shows the device and the device receives a linked event with what to play

#### Scenario: Device already linked

- **WHEN** someone tries to link a device that is linked to any screen
- **THEN** the request fails and the existing link is untouched, whatever the replace intent says

#### Scenario: Screen already has a player

- **WHEN** an admin links an available device to a screen that already has one, without asking to replace it
- **THEN** the request fails and the answer says the screen already has a player, with when that player was last
  seen, and both links are untouched

#### Scenario: Two owners race

- **WHEN** two workspaces link the same available device at the same moment
- **THEN** exactly one link is created

## ADDED Requirements

### Requirement: Replace a screen's player

Admins and owners SHALL replace the player on one of their active screens with another available device, in a
single confirmed action. Replacing SHALL close the screen's open link and open the new one together: if either
step fails, neither SHALL take effect. The displaced device SHALL be notified that it is no longer linked and
SHALL show its own pairing code again, and the new device SHALL be notified and start playing. Replacing SHALL be
refused when the incoming device is unavailable — not seen within the last 2 minutes, or already linked to a
screen — leaving the screen's existing player in place.

Before it is carried out, the platform SHALL tell the caller which player would be displaced and when it was last
seen, so a dead device and a working one are distinguishable.

#### Scenario: Swapping a broken player box

- **WHEN** an owner replaces the player on a screen whose device has been offline for 12 minutes, with an
  available device
- **THEN** the screen's link moves to the new device, the new device starts playing, and the screen reports the
  new device

#### Scenario: Replacing a player that is still working

- **WHEN** an owner asks to replace the player on a screen whose device was seen seconds ago
- **THEN** the platform first reports that the current player is online and how recently it was seen, and makes
  the change only once the owner confirms it

#### Scenario: Incoming device is not available

- **WHEN** an owner tries to replace a screen's player with a device that is offline or already linked elsewhere
- **THEN** the request fails and the screen keeps the player it had

#### Scenario: Plays stay attributed across a replacement

- **WHEN** a device is replaced on a screen and both devices later report plays that started before the change
- **THEN** each play is attributed to the screen its own device was linked to when that play started, and the
  displaced device's earlier plays remain attributed to that screen

#### Scenario: Displaced device comes back later

- **WHEN** the displaced device was offline during the replacement and reconnects afterwards
- **THEN** it learns it is unlinked and shows its own pairing code, without disturbing the screen's new player

# device-sync Specification

## Purpose

Defines how a player stays in sync with the platform over `/device/v1`: current state, live events with a polling
fallback, health heartbeats, play logs, and the status the dashboard shows.

## Requirements

### Requirement: Versioned device protocol

Device endpoints SHALL live under `/device/v1` and SHALL only change in backward-compatible, additive ways. Every
endpoint except register SHALL require a valid device token. Responses SHALL be JSON validated against published
schemas; invalid requests SHALL get a 400 with field errors.

#### Scenario: Missing token

- **WHEN** a device calls state, events, heartbeat or play-logs without a valid token
- **THEN** the response is 401

### Requirement: Current state

A device SHALL fetch its current state: whether it is linked, the screen name when linked, and the rotation to
play (versioned). Unlinked devices SHALL receive no rotation.

#### Scenario: Linked device polls

- **WHEN** a linked device requests its state
- **THEN** it receives linked, its screen name, and the rotation with a version

### Requirement: Live events

A device SHALL open a server-sent event stream that immediately delivers the current state and then pushes linked,
unlinked and rotation-updated events as they happen, with keep-alive messages at least every 30 seconds. While the
stream is open the device SHALL count as seen.

#### Scenario: Owner links while the TV waits

- **WHEN** a device's stream is open and an admin links it
- **THEN** the device receives a linked event within 2 seconds

### Requirement: Polling fallback

When the event stream cannot be kept open (3 consecutive failures), the player SHALL poll its state about every
60 seconds, keep retrying the stream in the background, and keep playing its last rotation while offline.

#### Scenario: Proxy blocks streaming

- **WHEN** event streams fail repeatedly but plain requests work
- **THEN** the player still picks up a link or unlink within about a minute

### Requirement: Heartbeat and health

A device SHALL send a heartbeat about every 60 seconds with its player version, shell, Chromium version, resolution,
current item, chosen codec, uptime and, when available, CPU load, memory and storage figures. The last heartbeat SHALL be shown
on the screen's detail.

#### Scenario: Health visible

- **WHEN** a linked device sends a heartbeat
- **THEN** the screen detail shows the reported version, codec, uptime and last activity

### Requirement: Derived status

The server SHALL derive each screen's status: unlinked (no device), online (stream open or seen within 2 minutes),
stale (seen within 10 minutes), offline (otherwise). Status changes SHALL be pushed to dashboard viewers of that
workspace.

#### Scenario: Player powered off

- **WHEN** a linked device stops sending anything
- **THEN** its screen becomes stale after 2 minutes and offline after 10 minutes

### Requirement: Play logs

A device SHALL upload plays in batches: item, start, end, result (completed, stalled, failed) and codec. Uploads SHALL
be idempotent (re-sending the same play does not duplicate it) and SHALL be attributed by link history.

#### Scenario: Retry after timeout

- **WHEN** a device re-sends a batch whose first upload timed out
- **THEN** each play is stored once

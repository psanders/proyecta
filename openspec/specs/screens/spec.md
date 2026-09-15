# screens Specification

## Purpose

Defines the screen inventory: virtual screens a workspace publishes, their descriptive fields, and their
lifecycle. A screen is separate from the physical device that plays on it.

## Requirements

### Requirement: Create and edit screens

Admins and owners SHALL create and edit screens in their workspace. A screen SHALL require a name and city.
It MAY carry place type, indoor/outdoor, address, physical width and height in centimeters, orientation,
resolution, available weekdays, daily start and end time, reference price in Dominican pesos, and pricing model.
End time SHALL be after start time. A screen missing availability (days and hours) or reference price SHALL be
reported as incomplete.

#### Scenario: Create a screen

- **WHEN** an admin creates a screen with a name and city
- **THEN** it appears in the workspace's screen list as active, unlinked and incomplete

#### Scenario: Invalid hours

- **WHEN** a screen is saved with an end time before its start time
- **THEN** the request fails with a Spanish validation error on the end time

#### Scenario: Member cannot edit

- **WHEN** a member (not admin or owner) edits a screen
- **THEN** the request fails as forbidden

### Requirement: List and view screens

Any workspace member SHALL list and view the workspace's screens. The list SHALL include each screen's status
(online, stale, offline, unlinked), whether it is incomplete, and totals for all, active (online) and incomplete
screens. Archived screens SHALL be excluded unless explicitly requested; deleted screens SHALL never appear.

#### Scenario: Screens of another workspace

- **WHEN** a user requests a screen that belongs to a different workspace
- **THEN** the request fails as not found

### Requirement: Archive screens

Admins and owners SHALL archive a screen that has no linked device. An archived screen SHALL be read-only,
SHALL keep its history, and SHALL NOT accept a device link. Archiving a linked screen SHALL fail.

#### Scenario: Archive after moving a device

- **WHEN** an admin unlinks the device and then archives the screen
- **THEN** the screen only appears when archived screens are requested, with its play history intact

#### Scenario: Archive a linked screen

- **WHEN** an admin archives a screen that still has a linked device
- **THEN** the request fails and asks to unlink first

### Requirement: Delete screens

Admins and owners SHALL delete a screen that has no linked device. Deletion SHALL hide the screen everywhere but
SHALL keep its play logs.

#### Scenario: Delete a screen

- **WHEN** an admin deletes an unlinked screen
- **THEN** it no longer appears in any list or lookup
- **AND** play logs recorded for it still exist

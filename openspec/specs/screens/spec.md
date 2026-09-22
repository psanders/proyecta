# screens Specification

## Purpose

Defines the screen inventory: virtual screens a workspace publishes, their descriptive fields, and their
lifecycle. A screen is separate from the physical device that plays on it.

## Requirements

### Requirement: Create and edit screens

Admins and owners SHALL create and edit screens in their workspace. A screen SHALL require a name and city.
It MAY carry place type, indoor/outdoor, address, a description of up to 500 characters, geographic coordinates
(latitude and longitude, both or neither, inside the Dominican Republic), up to 10 tags from the curated catalog,
physical width and height in centimeters, orientation, resolution, available weekdays, daily start and end time, and
a pay-per-display rate in Dominican dollars (US$) per every 5 seconds displayed. End time SHALL be after start time.
Resolution SHALL be stored with the larger dimension first. A screen missing availability (days and hours), a
pay-per-display rate or coordinates SHALL be reported as incomplete.

#### Scenario: Create a screen

- **WHEN** an admin creates a screen with a name and city
- **THEN** it appears in the workspace's screen list as active, unlinked and incomplete

#### Scenario: Complete screen

- **WHEN** a screen has available days, start and end time, a rate and coordinates
- **THEN** it is reported as complete, and removing its coordinates makes it incomplete again

#### Scenario: Invalid hours

- **WHEN** a screen is saved with an end time before its start time
- **THEN** the request fails with a Spanish validation error on the end time

#### Scenario: Coordinates outside the Dominican Republic

- **WHEN** a screen is saved with coordinates outside the Dominican Republic, or with only one of latitude and longitude
- **THEN** the request fails with a validation error on the coordinates

#### Scenario: Missing minus sign

- **WHEN** an owner enters `18.4861, 69.9312` as coordinates
- **THEN** the form tells them the longitude is missing its minus sign

#### Scenario: Screen details are shown

- **WHEN** an owner opens a screen that has a description, coordinates, tags and resolution `1920x1080`
- **THEN** its detail shows the description, the tag labels, `Full HD · 16:9` and the coordinates with a link that
  opens them in Google Maps

#### Scenario: Unknown tag

- **WHEN** a screen is saved with a tag that is not in the catalog
- **THEN** the request fails with a validation error on the tags

#### Scenario: Portrait resolution is normalized

- **WHEN** a screen is saved, or auto-filled from a paired device, with resolution `1080x1920`
- **THEN** it is stored as `1920x1080`, and shown as Full HD with a 9:16 aspect ratio when the orientation is portrait

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

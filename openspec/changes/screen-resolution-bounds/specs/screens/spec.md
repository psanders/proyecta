## MODIFIED Requirements

### Requirement: Create and edit screens

Admins and owners SHALL create and edit screens in their workspace. A screen SHALL require a name and city.
It MAY carry place type, indoor/outdoor, address, a description of up to 500 characters, geographic coordinates
(latitude and longitude, both or neither, inside the Dominican Republic), up to 10 tags from the curated catalog,
physical width and height in centimeters, orientation, resolution, available weekdays, daily start and end time, and
a pay-per-display rate in Dominican dollars (US$) per every 5 seconds displayed. End time SHALL be after start time.
Resolution SHALL be stored with the larger dimension first, and SHALL be rejected unless its shorter side is at
least 480 pixels and its longer side is at most 20,000 pixels. A resolution auto-filled from a newly linked device
that falls outside those bounds SHALL be left unset rather than failing the link. A screen missing availability
(days and hours), a pay-per-display rate or coordinates SHALL be reported as incomplete.

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

#### Scenario: Resolution below the floor

- **WHEN** a screen is saved with resolution `640x360`, whose shorter side is under 480 pixels
- **THEN** the request fails with a validation error on the resolution

#### Scenario: Resolution above the ceiling

- **WHEN** a screen is saved with resolution `50000x2000`, whose longer side is over 20,000 pixels
- **THEN** the request fails with a validation error on the resolution

#### Scenario: Device-reported resolution outside bounds is not auto-filled

- **WHEN** a device reporting resolution `640x360` is linked to a screen that has no resolution set
- **THEN** the link succeeds and the device starts playing, and the screen's resolution stays unset

#### Scenario: Existing out-of-bounds resolution is left alone

- **WHEN** a screen already stores a resolution outside the new bounds from before this rule existed
- **THEN** it keeps that resolution until an owner explicitly changes it, and is not refused or altered on its own

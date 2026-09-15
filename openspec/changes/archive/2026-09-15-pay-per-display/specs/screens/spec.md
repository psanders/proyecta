## MODIFIED Requirements

### Requirement: Create and edit screens

Admins and owners SHALL create and edit screens in their workspace. A screen SHALL require a name and city.
It MAY carry place type, indoor/outdoor, address, physical width and height in centimeters, orientation,
resolution, available weekdays, daily start and end time, and a pay-per-display rate in Dominican dollars (US$)
per every 5 seconds displayed. End time SHALL be after start time. A screen missing availability (days and
hours) or a pay-per-display rate SHALL be reported as incomplete.

#### Scenario: Create a screen

- **WHEN** an admin creates a screen with a name and city
- **THEN** it appears in the workspace's screen list as active, unlinked and incomplete

#### Scenario: Invalid hours

- **WHEN** a screen is saved with an end time before its start time
- **THEN** the request fails with a Spanish validation error on the end time

#### Scenario: Member cannot edit

- **WHEN** a member (not admin or owner) edits a screen
- **THEN** the request fails as forbidden

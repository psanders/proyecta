## Purpose

Lets owners manage their business's preferences, close a business safely, and always have a business to work in.

## ADDED Requirements

### Requirement: View and edit business preferences

Any member SHALL view the active business's name, currency and time zone. Admins and owners SHALL change the name
(1–50 characters) and the time zone (one of the supported IANA time zones, default America/Santo_Domingo). The currency
SHALL be shown as US$ and SHALL NOT be editable. Saving SHALL apply both changes or report which one failed.

#### Scenario: Admin changes the time zone

- **WHEN** an admin sets the time zone to America/New_York and saves
- **THEN** reading the settings returns America/New_York and the unchanged name

#### Scenario: Member views settings

- **WHEN** a member opens Configuración
- **THEN** they see the name, currency and time zone as read-only and cannot save

#### Scenario: Unsupported time zone

- **WHEN** someone saves a time zone outside the supported list
- **THEN** the request fails with a Spanish validation error on the time zone

### Requirement: Earnings follow the business time zone

The "today" and "last 7 days" windows of a screen's earnings summary SHALL be calendar days in its business's time
zone, including daylight-saving transitions.

#### Scenario: Business in New York

- **WHEN** a business uses America/New_York and a play was billed at 23:30 New York time yesterday
- **THEN** that play counts in the last 7 days but not today

### Requirement: Delete a business

Only the owner SHALL delete the business, and only after typing "ELIMINAR" to confirm. Deletion SHALL be refused while
any of its screens has a linked player. On success the business SHALL disappear for every member, its screens SHALL be
soft-deleted, and play logs SHALL be kept.

#### Scenario: Players still linked

- **WHEN** the owner deletes a business that still has a linked player
- **THEN** the request fails asking to unlink players first and nothing is deleted

#### Scenario: Admin tries to delete

- **WHEN** an admin (not owner) deletes the business
- **THEN** the request fails as forbidden

#### Scenario: Owner deletes an empty business

- **WHEN** the owner confirms deleting a business with no linked players
- **THEN** it no longer appears in anyone's business list and its screens are not listed anywhere

### Requirement: Always have a business

A signed-in person with no business SHALL be asked to create one (name, 1–50 characters) and SHALL become its owner.

#### Scenario: Last business deleted

- **WHEN** an owner deletes their only business
- **THEN** the dashboard shows the create-business step instead of an empty screen list

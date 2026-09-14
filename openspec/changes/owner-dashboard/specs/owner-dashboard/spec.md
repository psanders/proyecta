## Purpose

Defines what screen owners can see and do in the web dashboard: account access, first-run onboarding, managing
screens and their players, and managing their team, all in Spanish (es-DO).

## ADDED Requirements

### Requirement: Account access pages

The dashboard SHALL provide sign in, sign up (name, business name, email, password), forgot password and reset password
pages. Unauthenticated visitors to any other page SHALL be sent to sign in and returned to the page they wanted after
signing in. Signing out SHALL clear the session on this browser.

#### Scenario: Deep link while signed out

- **WHEN** a signed-out visitor opens a screen detail link
- **THEN** they see sign in, and after signing in they land on that screen detail

#### Scenario: Wrong password

- **WHEN** sign in fails
- **THEN** a Spanish error says the email or password is incorrect, without saying which

### Requirement: Session continuity

The dashboard SHALL keep the owner signed in across reloads and SHALL renew an expired access token transparently
using the refresh token. If renewal fails the owner SHALL be sent to sign in.

#### Scenario: Token expires during use

- **WHEN** the access token expires while the owner is using the dashboard
- **THEN** their next action succeeds without asking them to sign in

### Requirement: Workspace context

The dashboard SHALL show the active business in the sidebar, let the owner switch between businesses they belong to,
and scope every page to the active one. Actions the owner's role doesn't allow SHALL be hidden or disabled.

#### Scenario: Member view

- **WHEN** a member (not admin) opens a screen detail
- **THEN** edit, link, unlink, archive and delete actions are not available

### Requirement: Onboarding

A newly signed-up owner with no screens SHALL see the onboarding page: download the player, enter the code shown on the
TV (8 characters, XXXX-XXXX), and continue to fill in the screen's information; or skip pairing and add the screen
without a device.

#### Scenario: Pair during onboarding

- **WHEN** an owner types the code of an online, unlinked player and continues
- **THEN** a screen is created and linked, the add-screen form opens with its resolution filled from the device, and
  the TV starts playing

#### Scenario: Code not available

- **WHEN** the typed code is unknown, offline or already linked
- **THEN** the page explains which, in Spanish, and does not continue

### Requirement: Screens overview

The screens page SHALL list the active business's screens with name, place and city, availability summary, and a live
status badge (En línea, Inestable, Sin conexión, Sin reproductor), plus totals for screens, active and incomplete ones.
An "Archivadas" filter SHALL show archived screens. With no screens the empty state SHALL invite adding the first one.

#### Scenario: Player turns off

- **WHEN** a linked player stops reporting
- **THEN** its badge changes to Inestable and then Sin conexión without reloading the page

### Requirement: Add and edit screens

Admins and owners SHALL add and edit screens through the form designed in Pencil (basic info, technical specs,
availability, commercial info), with inline Spanish validation.

#### Scenario: Save a complete screen

- **WHEN** an admin fills every section validly and saves
- **THEN** they land on the screen detail and the screen is not marked incomplete

### Requirement: Screen detail and player actions

The screen detail SHALL show the screen's information and the device panel: live status, last activity, pairing code,
and reported health (player version, codec, uptime, memory/storage when reported). Admins and owners SHALL link a player
by code when none is linked, and unlink, archive or delete through confirmation dialogs that explain the consequence.
Archive and delete SHALL be offered only when no player is linked, with a shortcut to unlink first.

#### Scenario: Move a player

- **WHEN** an admin confirms "Desvincular reproductor"
- **THEN** the panel shows no player, and the TV returns to its code screen

#### Scenario: Archive

- **WHEN** an admin archives an unlinked screen
- **THEN** it leaves the main list and appears under Archivadas as read-only

### Requirement: Team management

The team page SHALL list members with name, email, role and status (Activo, Pendiente). Admins and owners SHALL invite
by email and role, resend pending invitations and remove members (never the owner). Anyone opening an invitation link
SHALL see whether it was accepted or is invalid, with a way to sign in.

#### Scenario: Invite a teammate

- **WHEN** an admin invites an email as Miembro
- **THEN** the person appears as Pendiente and receives the invitation email

#### Scenario: Invalid invitation

- **WHEN** someone opens an expired invitation link
- **THEN** they see that the invitation is invalid or expired

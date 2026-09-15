## Purpose

Models each business as a workspace with members and roles, so several people can operate a
business's screens with the right permissions, and defines the authorization every dashboard
capability uses.

## ADDED Requirements

### Requirement: Roles and permissions

Each workspace member SHALL have exactly one role: owner (Propietario), admin (Administrador) or
member (Miembro). Members SHALL be able to view the workspace's resources. Admins and owners SHALL
additionally be able to manage resources and members. Only owners SHALL perform irreversible
workspace-level actions.

#### Scenario: Member tries to manage members

- **WHEN** a member (not admin or owner) invites or removes someone
- **THEN** the request fails as forbidden

### Requirement: Active workspace

Workspace-scoped requests SHALL name the workspace they act in. The system SHALL honor the request
only if the authenticated user belongs to that workspace, and SHALL apply the user's role in that
workspace.

#### Scenario: Requesting a foreign workspace

- **WHEN** a user calls a workspace-scoped procedure naming a workspace they don't belong to
- **THEN** the call fails as forbidden and no data from that workspace is returned

#### Scenario: Listing workspaces

- **WHEN** a user lists their workspaces
- **THEN** they see every workspace they own or are an active member of, with their role in each

### Requirement: Rename workspace

Admins and owners SHALL be able to rename their workspace.

#### Scenario: Admin renames

- **WHEN** an admin renames the active workspace to a non-empty name
- **THEN** listing workspaces shows the new name

### Requirement: Invite members

Admins and owners SHALL be able to invite a person by email with a role of admin or member. The
invitee SHALL receive a Spanish, Proyecta-branded email with a link to accept. A person who has no
account SHALL receive a one-time password with the invite. Inviting an existing member SHALL fail.
Pending invitations SHALL be listed with status pending and MAY be resent.

#### Scenario: Invite a new person

- **WHEN** an admin invites an email with no account as a member
- **THEN** the member list shows that person with status pending
- **AND** an invitation email is sent

#### Scenario: Invite an existing member

- **WHEN** an admin invites an email that already belongs to the workspace
- **THEN** the request fails with a conflict error

#### Scenario: Resend

- **WHEN** an admin resends a pending invitation
- **THEN** a new invitation email is sent

### Requirement: Accept invitation

A person SHALL accept an invitation by opening the emailed link. A valid, unexpired invitation
SHALL make the membership active. An invalid or expired invitation SHALL be rejected.

#### Scenario: Valid link

- **WHEN** an invitee opens a valid invitation link
- **THEN** their membership becomes active and they are sent to sign in

#### Scenario: Expired link

- **WHEN** an invitee opens an expired or tampered link
- **THEN** they see that the invitation is invalid and nothing changes

### Requirement: Remove members

Admins and owners SHALL be able to remove a member or cancel a pending invitation. The workspace
owner SHALL NOT be removable.

#### Scenario: Remove a member

- **WHEN** an admin removes a member
- **THEN** that person no longer appears in the member list and can no longer act in the workspace

#### Scenario: Remove the owner

- **WHEN** anyone tries to remove the workspace owner
- **THEN** the request fails and the owner remains

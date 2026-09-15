# owner-auth Specification

## Purpose

Lets screen owners create an account, sign in, keep a session alive, recover a forgotten
password, and manage their own profile, backed by Fonoster Identity.

## Requirements

### Requirement: Sign up creates an account and a first workspace

The system SHALL let a person sign up with their name, business name, email and password. On
success it SHALL create the user, sign them in, and create a workspace named after the business,
owned by that user. Email SHALL be normalized (trimmed, lowercased). Passwords SHALL be at least
8 characters.

#### Scenario: New owner signs up

- **WHEN** a person submits a valid name, business name, unused email and password
- **THEN** the response contains an access token and a refresh token
- **AND** the user is the owner of exactly one workspace named after the business

#### Scenario: Email already registered

- **WHEN** a person signs up with an email that already has an account
- **THEN** the request fails with a conflict error and no workspace is created

#### Scenario: Invalid input

- **WHEN** the email is malformed or the password is shorter than 8 characters
- **THEN** the request fails with field-level validation errors in Spanish

### Requirement: Sign in with email and password

The system SHALL exchange a valid email and password for an access token and a refresh token.

#### Scenario: Valid credentials

- **WHEN** an owner signs in with a correct email and password
- **THEN** an access token and a refresh token are returned

#### Scenario: Wrong credentials

- **WHEN** the email or password is wrong
- **THEN** the request fails as unauthorized without revealing which one was wrong

### Requirement: Session refresh

The system SHALL exchange a valid refresh token for a new access/refresh token pair, and SHALL
reject expired or invalid refresh tokens.

#### Scenario: Access token expired

- **WHEN** a client presents a valid refresh token
- **THEN** a new access token and refresh token are returned

#### Scenario: Refresh token invalid

- **WHEN** a client presents an expired or tampered refresh token
- **THEN** the request fails as unauthorized and the client must sign in again

### Requirement: Authenticated requests

Dashboard API requests SHALL authenticate with a bearer access token. The system SHALL accept a
token only if its RS256 signature verifies against Identity's public key, its issuer and audience
match the deployment, it has not expired, and it is an access token (not an id or refresh token).

#### Scenario: Missing or invalid token

- **WHEN** a protected procedure is called without a token, with an expired token, or with a refresh token
- **THEN** the call fails as unauthorized

### Requirement: Password reset

The system SHALL let an owner request a password reset by email and complete it with the emailed
code and a new password. Requesting a reset SHALL respond the same way whether or not the email
has an account.

#### Scenario: Reset requested

- **WHEN** an owner requests a reset for their email
- **THEN** a Spanish reset email with a code and link is sent
- **AND** the response is identical for unknown emails

#### Scenario: Reset completed

- **WHEN** the owner submits the correct code and a new valid password
- **THEN** they can sign in with the new password and not the old one

### Requirement: Profile

An authenticated owner SHALL be able to read their profile (name, email) and update their name
and password.

#### Scenario: Owner renames themself

- **WHEN** an authenticated owner updates their name
- **THEN** subsequent profile reads return the new name

## Purpose

Defines the dashboard's navigation: the vertical menu for the business's work areas and the account menu for personal
and team items.

## ADDED Requirements

### Requirement: Vertical menu

The vertical menu SHALL list Pantallas and Configuración for every member, expanded (icon + label) or collapsed
(icon rail), and SHALL mark the current section.

#### Scenario: Open settings

- **WHEN** a member selects Configuración in the vertical menu
- **THEN** the business settings page opens and Configuración is marked as current

### Requirement: Account menu

The account menu at the bottom of the vertical menu SHALL show the person's initials, name and email, and SHALL offer
Mi perfil, Equipo, switching between their businesses (marking the active one) and Cerrar sesión. It SHALL close on
selection, Escape or clicking outside.

#### Scenario: Go to the team page

- **WHEN** someone opens the account menu and selects Equipo
- **THEN** the team page opens and the menu closes

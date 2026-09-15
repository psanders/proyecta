# dashboard-appearance Specification

## Purpose

Lets each person choose whether the owner dashboard is light, dark or follows their operating system.

## Requirements
### Requirement: Theme preference

The Mi perfil page SHALL offer Apariencia with Sistema, Claro and Oscuro, marking the current choice, as one of the
settings of its Preferencias section (together with Idioma). Sistema SHALL be the default. Choosing an option SHALL
apply the theme to the whole dashboard immediately, without a save button or a reload. The account menu SHALL NOT
contain a theme control.

#### Scenario: Switch to dark

- **WHEN** someone opens Mi perfil and selects Oscuro in Apariencia
- **THEN** the dashboard renders with the dark theme and Oscuro is marked as current

#### Scenario: Default follows the system

- **WHEN** someone with no saved choice opens the dashboard on a device set to dark mode
- **THEN** the dashboard renders dark and Sistema is marked as current

#### Scenario: System changes while open

- **WHEN** the choice is Sistema and the operating system switches from light to dark
- **THEN** the dashboard switches to dark without a reload

### Requirement: Remembered per browser

The choice SHALL be remembered in that browser across reloads and sign-outs, and SHALL be applied before the dashboard
first paints. If the browser cannot store it, the dashboard SHALL behave as Sistema.

#### Scenario: Reload keeps dark

- **WHEN** someone selected Oscuro and reloads the page
- **THEN** the first rendered frame is already dark and Oscuro is still marked

#### Scenario: Sign-in page

- **WHEN** someone who selected Claro signs out on a dark-mode device
- **THEN** the sign-in page renders light


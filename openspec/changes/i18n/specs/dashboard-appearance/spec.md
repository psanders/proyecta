## MODIFIED Requirements

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

## Purpose

Lets each business choose whether its dashboard shows the screen-owner side, the advertiser side or both, so
one-sided businesses aren't cluttered, without ever changing what the business can access or how it is billed.

## ADDED Requirements

### Requirement: Dashboard view setting

Every business SHALL have a dashboard view: screen owner ("Publicar pantallas"), advertiser ("Anunciar") or both
("Ambos"). A business that never chose one SHALL use screen owner. Any member SHALL read it; only admins and owners
SHALL change it, and an invalid value SHALL fail with a validation error.

#### Scenario: Existing business

- **WHEN** a business created before this capability reads its settings
- **THEN** its dashboard view is screen owner

#### Scenario: Admin switches to both

- **WHEN** an admin sets the dashboard view to both
- **THEN** reading the settings returns both for every member of the business

#### Scenario: Member tries to change the view

- **WHEN** a member (not admin or owner) changes the dashboard view
- **THEN** the request fails as forbidden and the view is unchanged

#### Scenario: Unknown view

- **WHEN** someone saves a dashboard view that isn't one of the three
- **THEN** the request fails with a validation error on the view

### Requirement: Choose the view when a business is created

Creating a business SHALL ask "¿Qué quieres hacer con Proyecta?" with the three views, defaulting to Publicar
pantallas. After sign-up, the welcome step SHALL ask it before anything else and save the choice for the new
business. Choosing Publicar pantallas or Ambos SHALL continue to pairing a player; choosing Anunciar SHALL continue to
Buscar pantallas.

#### Scenario: New advertiser signs up

- **WHEN** someone signs up and chooses Anunciar on the welcome step
- **THEN** the business's view is advertiser and they land on Buscar pantallas

#### Scenario: Create a second business for both sides

- **WHEN** someone creates another business and chooses Ambos
- **THEN** the new business's view is both

### Requirement: Menu follows the view

The vertical menu SHALL show, for screen owner: Pantallas and Configuración; for advertiser: Buscar pantallas,
Anuncios, Recursos and Configuración; for both: a "Pantallas" group (Pantallas), an "Anuncios" group (Buscar
pantallas, Anuncios, Recursos) and Configuración, with group headings when expanded and a divider between groups
when collapsed. Home SHALL open Pantallas for screen owner and both, and Anuncios for advertiser.

#### Scenario: Advertiser menu

- **WHEN** a member of an advertiser business opens the dashboard
- **THEN** the menu has no Pantallas item and home shows Anuncios

#### Scenario: Both menu

- **WHEN** a member of a business with view both opens the dashboard
- **THEN** the menu shows the Pantallas and Anuncios groups with their headings

### Requirement: The view is presentation only

The dashboard view SHALL NOT restrict any API operation or page: every page SHALL stay reachable by its address,
screens SHALL keep playing, ads SHALL keep running and plays SHALL keep being billed whatever the view.

#### Scenario: Advertiser business opens a screen link

- **WHEN** a member of a business whose view is advertiser opens the address of one of its screens
- **THEN** the screen detail loads normally

#### Scenario: Screens keep earning when hidden

- **WHEN** a business with linked screens switches its view to advertiser
- **THEN** its players keep playing and new completed plays are still billed

### Requirement: Confirm before hiding an active side

When an admin changes the view so that a side is hidden while that side has active things — linked screens for the
owner side, ads that are on air or scheduled for the advertiser side — the dashboard SHALL ask for confirmation
first, naming what stays active (e.g. "Tus 3 pantallas siguen activas y facturando. Solo cambia lo que ves en el
panel."). Cancelling SHALL keep the previous view.

#### Scenario: Hiding linked screens

- **WHEN** an admin of a business with 3 linked screens changes the view from both to advertiser
- **THEN** a confirmation says the 3 screens stay active, and the view changes only after confirming

#### Scenario: Nothing active

- **WHEN** an admin of a business with no linked screens changes the view from screen owner to advertiser
- **THEN** the view changes without a confirmation

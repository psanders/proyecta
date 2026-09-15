## MODIFIED Requirements

### Requirement: Menu follows the view

The vertical menu SHALL show, for screen owner: Pantallas, Solicitudes and Configuración; for advertiser: Buscar
pantallas, Anuncios, Recursos and Configuración; for both: a "Pantallas" group (Pantallas, Solicitudes), an "Anuncios"
group (Buscar pantallas, Anuncios, Recursos) and Configuración, with group headings when expanded and a divider between
groups when collapsed. Solicitudes SHALL carry the pending request count. Home SHALL open Pantallas for screen owner and
both, and Anuncios for advertiser.

#### Scenario: Advertiser menu

- **WHEN** a member of an advertiser business opens the dashboard
- **THEN** the menu has no Pantallas item and home shows Anuncios

#### Scenario: Both menu

- **WHEN** a member of a business with view both opens the dashboard
- **THEN** the menu shows the Pantallas and Anuncios groups with their headings

#### Scenario: Pending requests in the menu

- **WHEN** a screen-owner business has 3 pending requests
- **THEN** Solicitudes shows 3 in the menu

## ADDED Requirements

### Requirement: Hidden side needs attention

When the dashboard view hides the screen-owner side and the business has pending requests, every page SHALL show a
banner with the count ("Tienes 2 solicitudes de anuncios en tus pantallas") and a link to Solicitudes; admins and owners
SHALL also get "Mostrar ambos", which switches the view to both. The banner SHALL disappear when there are no pending
requests.

#### Scenario: Advertiser view with a pending request

- **WHEN** a business whose view is advertiser has 1 pending request
- **THEN** the dashboard shows the banner with a link to Solicitudes

#### Scenario: Show both

- **WHEN** an admin selects "Mostrar ambos" on the banner
- **THEN** the view becomes both, the menu shows Solicitudes and the banner disappears

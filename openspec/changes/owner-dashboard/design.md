## Context

Pencil (`design/pencil.pen`) has login, onboarding, screen dashboard (+ empty), add/edit screen and screen detail frames
built from the Lunaris design system (JetBrains Mono + Geist, orange `#EC5E2B` accent, light app surfaces). The dashboard
package is a bare Vite + React + Tailwind v4 + tRPC app. APIs come from `identity-auth` and `device-protocol`.

## Goals / Non-Goals

**Goals:** pixel-faithful implementation of the Pencil screens; one component per Pencil component so design and code
stay in lockstep; live status without polling loops in every page.
**Non-Goals:** a general design system package, dark mode for the dashboard, i18n.

## Decisions

- **Pencil first, then code.** A `dashboard: components` frame holds reusable components; screens are instances. Each
  Pencil component maps to one React component with the same name in `packages/dashboard/src/components/`.
- **Tokens**: Lunaris variables from Pencil exported to Tailwind v4 `@theme` (colors, radii, fonts) in `index.css`;
  fonts self-hosted via `@fontsource` (JetBrains Mono, Geist Sans).
- **Routing**: `react-router` data routes: `/ingresar`, `/crear-cuenta`, `/recuperar`, `/restablecer`,
  `/invitacion`, `/` (screens), `/bienvenida` (onboarding), `/pantallas/nueva`, `/pantallas/:id`,
  `/pantallas/:id/editar`, `/equipo`, `/perfil`. Guard route requires a session.
- **Session**: tokens + active workspace in `localStorage` via a small `session` module; tRPC `httpBatchLink` headers
  add `Authorization` and `x-workspace`; a custom link retries once after `auth.refresh` on `UNAUTHORIZED`.
- **Live status**: one `screens.onStatus` subscription per session (`httpSubscriptionLink`) that patches the React Query
  cache for list and detail queries.
- **Forms**: controlled forms validated with the same `@proyecta/common` Zod schemas the API uses (errors in Spanish).
- **Icons**: Material Symbols Sharp (the set the Pencil screens actually use), inlined from `@material-symbols/svg-400`.
- **Onboarding links on save**: the code is checked live, carried to the add-screen form, and the player is linked right
  after the screen is created, so abandoning the form never leaves an empty linked screen behind.
- **Port**: the dashboard dev server runs on 5175 (5173 is used by another local project); Identity invite/reset URLs match.

## Risks / Trade-offs

- [Design churn during the human design gate] → build components only after the design is approved.
- [Pencil ↔ code drift] → Playwright screenshots of key pages reviewed against Pencil exports at the test stage.

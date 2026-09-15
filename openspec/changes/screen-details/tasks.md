## 1. Design (Pencil)

- [ ] 1.1 Update `add-screen` / `edit-screen`: description, coordinates with Maps link, resolution preset + derived hint, Etiquetas chips; `screen-detail` shows them; verify with screenshots

## 2. Contracts (`@proyecta/common`)

- [ ] 2.1 `utils/resolution.ts` (parse, normalize, tier, aspect ratio, presets) with unit tests incl. invalid input
- [ ] 2.2 `utils/coordinates.ts` (`parseCoordinates`, DR bounds) with unit tests incl. missing minus, swapped, outside DR, Maps URLs
- [ ] 2.3 `schemas/screenTags.schema.ts` catalog; screen schema adds description, latitude/longitude, tags, normalized resolution; `isScreenComplete` requires coordinates; API messages es/en; schema tests

## 3. API

- [ ] 3.1 Prisma fields + migration (CHECK constraints, resolution swap); verify migrate against dev and test databases
- [ ] 3.2 Create/update persist new fields; view exposes them plus tier and aspect ratio; pairing auto-fill normalizes; unit tests

## 4. Dashboard

- [ ] 4.1 Form: description, coordinates (parse + hint + Maps link), resolution presets/custom + derived hint, tag chips; messages es/en
- [ ] 4.2 Detail page shows description, location, tags, tier/aspect ratio
- [ ] 4.3 Playwright: create a screen with coordinates and tags → complete

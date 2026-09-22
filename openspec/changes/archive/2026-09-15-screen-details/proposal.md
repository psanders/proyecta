## Why

Advertisers will choose screens by what they are, where they are and who sees them. A screen today has only a free-text
resolution: no description, no coordinates, and no way to describe its audience or surroundings.

## What Changes

- **Description**: optional free text (up to 500 characters) shown to advertisers.
- **Coordinates**: latitude and longitude entered manually (pasted from Google Maps as `18.4861, -69.9312` or a Maps
  link), validated to fall inside the Dominican Republic, with specific hints for a missing minus sign or swapped
  values. A screen without coordinates is **incomplete**.
- **Tags**: a curated catalog (audience, area, traffic, experience), stored as English ids, labeled in the dashboard's
  Spanish and English catalogs. Up to 10 per screen.
- **Resolution**: one native resolution, stored normalized landscape (`1080x1920` → `1920x1080`); orientation says how
  the panel is mounted. The quality tier (SD, HD, Full HD, 4K, 8K) and aspect ratio are derived, never entered.
- Non-goals: map picker, geocoding, PostGIS, free-form tags, pixel pitch, multiple resolutions per screen.

## Capabilities

### Modified Capabilities
- `screens`: new descriptive fields, completeness now includes coordinates, normalized resolution.

## Impact

- `packages/common`: resolution and coordinate utils, tag catalog, screen schema fields and messages.
- `packages/api`: `Screen.description`, `latitude`, `longitude`, `tags` + migration; view adds derived facets; pairing
  normalizes the device resolution.
- `packages/dashboard`: form fields (description, coordinates, resolution presets, tag chips) and detail cards.
- `design/pencil.pen`: add-screen, edit-screen and screen-detail frames.
- `/device/v1` is unchanged.

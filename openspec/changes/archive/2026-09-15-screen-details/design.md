## Context

A panel has one native resolution. The player reports `screen.width × devicePixelRatio`, which is the output of the box
driving the panel (a 1080p stick on a 4K TV reports 1920x1080), so it is a prefill the owner confirms. "HD" vs "4K" is
a consequence of the resolution, so asking for both would let them disagree.

## Decisions

- **Resolution** stays a `"WxH"` string (the device protocol's format), normalized so width ≥ height on every write,
  including the pairing auto-fill. Existing rows are swapped in the migration. Derived at read time in
  `@proyecta/common`:
  - tier by the shorter side: ≥4320 8K, ≥2160 4K, ≥1080 Full HD, ≥720 HD, else SD;
  - aspect ratio reduced and snapped (within 2%) to 16:9, 16:10, 4:3, 21:9, 32:9, 1:1 or 3:1, else `2.39:1`-style;
    shown portrait (e.g. 9:16) when the orientation is portrait.
  The form offers presets (1280x720, 1920x1080, 2560x1440, 3840x2160) plus a custom width × height.
- **Coordinates**: `latitude`/`longitude` `DOUBLE PRECISION` columns, both or neither (CHECK constraint). The schema
  checks ranges and a Dominican Republic bounding box (lat 17.3–20.0, lng −72.1 to −68.2; slightly overlaps Haiti near
  the border, acceptable for v0). `parseCoordinates` in common turns pasted text or a Google Maps URL (`@lat,lng`,
  `q=`/`query=`/`ll=` params) into numbers rounded to 6 decimals, or a message id: missing minus sign, swapped values,
  outside DR, unreadable. Completeness adds both coordinates.
- **Tags**: `SCREEN_TAG_GROUPS` in common is the source of truth (English ids, e.g. `tourist-area`); `tags TEXT[]`
  on `Screen`; the schema accepts only catalog ids, de-duplicated, max 10. Labels live in the dashboard message catalogs
  as `tag.<id>` and `tagGroup.<group>`, so a new language is a translation, not a data change. Tags don't repeat place
  type, indoor/outdoor, city, orientation or resolution.
- **Description**: `optionalText(500)`, rendered as plain text.

## Risks / Trade-offs

- [Existing screens become incomplete until coordinates are added] → intended: advertisers need location.
- [A removed catalog id stays stored] → the view drops ids not in the catalog; the next save cleans the row.
- [Bounding box accepts a sliver of Haiti] → acceptable for manual entry in v0; geocoding can tighten it later.

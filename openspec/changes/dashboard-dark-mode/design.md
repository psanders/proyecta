## Context

Pencil's Lunaris variables have a `Mode` theme axis (`Light`, `Dark`) with a value for each. A frame's `theme` property
selects the axis value for its subtree, so a screen switches by setting `theme: { Mode: "Dark" }` on its frame. The
dashboard's `index.css` defines Tailwind v4 `@theme` colors from the Light values only.

## Decisions

- **Tokens**: keep Tailwind `@theme` names; override the same CSS variables under `:root[data-theme="dark"]` with the
  Pencil Dark values. Components keep using `bg-card`, `text-foreground`, etc., so no per-component `dark:` classes.
- **Preference**: `system | light | dark`, stored in `localStorage` under `proyecta.theme`. Resolved theme =
  preference, or `prefers-color-scheme` when `system`, re-evaluated when the OS setting changes.
- **No flash**: a small inline script in `index.html` sets `data-theme` and `color-scheme` on `<html>` before the app
  bundle loads. Storage errors (private mode) fall back to `system`.
- **Control**: an Apariencia card at the end of Mi perfil (after Datos personales and Contraseña) with a three-option
  segmented control (Sistema / Claro / Oscuro). Unlike the other cards it has no save button: the theme is a local
  display preference, so it applies on click. The account menu stays free of settings.
- **Pencil**: rebind raw hex fills/strokes on dashboard frames and `Dashboard/*` components to the matching `$--`
  variable. Keep screens in Light by default; flipping `Mode` on any frame previews dark.
- **Auth brand panel** stays dark in both themes (it is already the dark brand surface).

## Risks / Trade-offs

- [Hex values without an exact token] → map to the nearest semantic token and note it; never invent colors.
- [Status badge contrast in dark] → use the Pencil Dark `--color-*` pairs, verified with screenshots.

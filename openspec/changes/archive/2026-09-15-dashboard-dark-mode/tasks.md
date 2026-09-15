## 1. Design (Pencil)

- [x] 1.1 Rebind raw hex fills/strokes on dashboard screens and `Dashboard/*` components to `$--` variables; verify each screen screenshot in Light (unchanged) and Dark
- [x] 1.2 Add a `profile` frame (Datos personales, Contraseña, Apariencia with Sistema / Claro / Oscuro); keep `Dashboard/Account Menu` without a theme control; verify in Light and Dark

## 2. Dashboard

- [x] 2.1 Dark token values under `:root[data-theme="dark"]`; replace literal colors (`text-white`, `bg-black/40`) with tokens where they must adapt (none needed: `text-white` is only on the always-dark brand panel, the `bg-black/40` dialog backdrop works in both)
- [x] 2.2 Theme preference (validated `system|light|dark`, `localStorage`, `prefers-color-scheme` listener) and pre-paint script in `index.html`; verify unit tests incl. an invalid stored value
- [x] 2.3 Apariencia section on Mi perfil; verify Playwright: select Oscuro → dark, reload stays dark, Sistema follows emulated color scheme, account menu has no theme control

## 3. Verification

- [x] 3.1 Lint, typecheck, unit and e2e green

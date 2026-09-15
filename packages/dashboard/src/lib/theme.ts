/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** Also read by the pre-paint script in index.html; keep both in sync. */
export const THEME_KEY = "proyecta.dashboard.theme";
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export interface ThemeDeps {
  storage: Pick<Storage, "getItem" | "setItem">;
  /** `matchMedia("(prefers-color-scheme: dark)")`. */
  media: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
  root: { setAttribute(name: string, value: string): void; style: { colorScheme: string } };
}

type Listener = () => void;

/**
 * Theme preference remembered per browser. "system" follows the OS color scheme and re-applies when
 * it changes. The resolved theme is written to `<html data-theme>`, which switches the CSS tokens.
 */
export function createThemeStore({ storage, media, root }: ThemeDeps) {
  const listeners = new Set<Listener>();
  const read = (): ThemePreference => {
    try {
      const value = storage.getItem(THEME_KEY);
      return isThemePreference(value) ? value : "system";
    } catch {
      return "system";
    }
  };
  let preference = read();

  const resolved = (): ResolvedTheme =>
    preference === "system" ? (media.matches ? "dark" : "light") : preference;
  const apply = () => {
    const theme = resolved();
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    listeners.forEach((listener) => listener());
  };
  const onSystemChange = () => {
    if (preference === "system") apply();
  };

  return {
    get: () => preference,
    resolved,
    set(next: ThemePreference) {
      if (!isThemePreference(next))
        throw new TypeError(`Invalid theme preference: ${String(next)}`);
      preference = next;
      try {
        storage.setItem(THEME_KEY, next);
      } catch {
        // Private mode: the choice applies now but isn't remembered.
      }
      apply();
    },
    /** Applies the current theme and follows OS changes; returns a stop function. */
    start() {
      apply();
      media.addEventListener("change", onSystemChange);
      return () => media.removeEventListener("change", onSystemChange);
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    }
  };
}

export type ThemeStore = ReturnType<typeof createThemeStore>;

const memory = new Map<string, string>();

export const theme =
  typeof window === "undefined"
    ? null
    : createThemeStore({
        storage: (() => {
          try {
            return window.localStorage;
          } catch {
            return {
              getItem: (key: string) => memory.get(key) ?? null,
              setItem: (key: string, value: string) => void memory.set(key, value)
            };
          }
        })(),
        media: window.matchMedia("(prefers-color-scheme: dark)"),
        root: document.documentElement
      });

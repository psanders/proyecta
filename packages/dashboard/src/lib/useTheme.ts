/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useSyncExternalStore } from "react";
import { theme, type ThemePreference } from "./theme.js";

const noop = () => () => undefined;
const system = (): ThemePreference => "system";

export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const preference = useSyncExternalStore(theme?.subscribe ?? noop, theme?.get ?? system, system);
  return [preference, (next) => theme?.set(next)];
}

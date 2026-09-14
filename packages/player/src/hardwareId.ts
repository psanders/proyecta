/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

const STORAGE_KEY = "proyecta.hwId";

declare global {
  interface Window {
    /** Injected by native shells (Android, kiosk launcher). */
    ProyectaShell?: { hardwareId?: () => string; shell?: () => string };
  }
}

/**
 * The id that makes this device's pairing code permanent: from the native shell, a `?hw=` launch
 * parameter, or (plain browser only) a random id kept in localStorage. The browser id resets if
 * site data is cleared, which yields a new code; real shells always pass hardware ids.
 */
export function resolveHardwareId(
  params: URLSearchParams,
  storage: Storage = localStorage
): string {
  const fromShell = window.ProyectaShell?.hardwareId?.();
  if (fromShell) return fromShell;
  const fromParam = params.get("hw");
  if (fromParam) return fromParam;
  let stored = storage.getItem(STORAGE_KEY);
  if (!stored) {
    stored = `browser-${crypto.randomUUID()}`;
    storage.setItem(STORAGE_KEY, stored);
  }
  return stored;
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { Session } from "@proyecta/common";

export interface StoredSession extends Session {
  /** Active business (Identity workspace accessKeyId). */
  workspace: string | null;
}

const KEY = "proyecta.dashboard.session";
type Listener = (session: StoredSession | null) => void;

/**
 * Session persisted in localStorage with change notifications, so the tRPC client and the React
 * tree agree on tokens and the active business.
 */
export function createSessionStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const listeners = new Set<Listener>();
  const read = (): StoredSession | null => {
    try {
      const value = JSON.parse(storage.getItem(KEY) ?? "null") as StoredSession | null;
      return value?.accessToken && value.refreshToken ? value : null;
    } catch {
      return null;
    }
  };
  let current = read();
  const emit = () => listeners.forEach((listener) => listener(current));

  return {
    get: () => current,
    set(next: StoredSession | null) {
      current = next;
      if (next) storage.setItem(KEY, JSON.stringify(next));
      else storage.removeItem(KEY);
      emit();
    },
    update(patch: Partial<StoredSession>) {
      if (!current) return;
      this.set({ ...current, ...patch });
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
const memory = new Map<string, string>();
const fallback = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key)
};

export const session = createSessionStore(
  typeof localStorage === "undefined" ? fallback : localStorage
);

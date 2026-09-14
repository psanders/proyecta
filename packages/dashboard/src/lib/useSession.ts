/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useSyncExternalStore } from "react";
import { session, type StoredSession } from "./session.js";

export function useSession(): StoredSession | null {
  return useSyncExternalStore(session.subscribe, session.get, session.get);
}

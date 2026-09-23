/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { PlayRecord } from "./engine.js";
import type { ShellBridge } from "./shellInfo.js";

declare global {
  interface Window {
    /** Test and debugging hook: play log and active manifest version. */
    __proyecta: { plays: PlayRecord[]; manifestVersion?: string };
    /** Injected by the Android shell (shells/android, ShellBridge.kt). */
    ProyectaShell?: ShellBridge;
  }
}

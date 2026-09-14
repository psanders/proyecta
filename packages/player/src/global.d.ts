/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { PlayRecord } from "./engine.js";

declare global {
  interface Window {
    /** Test and debugging hook: play log and active manifest version. */
    __proyecta: { plays: PlayRecord[]; manifestVersion?: string };
  }
}

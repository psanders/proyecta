/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { DbClient } from "../../db.js";
import type { EventHub } from "../../events/hub.js";
import type { RotationLoader } from "../../events/rotation.js";
import type { ScreenRotationLoader } from "../ads/createScreenRotationLoader.js";

/** Dependencies shared by screen, pairing and device-sync functions. */
export interface ScreenDeps {
  db: DbClient;
  hub: EventHub;
  now?: () => Date;
}

export interface DeviceSyncDeps extends ScreenDeps {
  /** The default rotation, for screens with no approved ads in their dates. */
  loadRotation: RotationLoader;
  /** A screen's own rotation from its approved, in-date ads. */
  loadScreenRotation: ScreenRotationLoader;
}

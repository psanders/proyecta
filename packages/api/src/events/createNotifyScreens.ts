/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { buildDeviceState } from "../api/devices/buildDeviceState.js";
import type { DeviceSyncDeps } from "../api/screens/deps.js";
import { logger } from "../logger.js";

/**
 * Creates a function that pushes a fresh `rotation.updated` state to the players currently linked
 * to the given screens. Failures are logged, never thrown: the mutation that triggered it already
 * succeeded, and players also pick changes up when they poll.
 *
 * @param deps - Injected device-sync dependencies
 */
export function createNotifyScreens(deps: DeviceSyncDeps) {
  return async (screenIds: string[]): Promise<void> => {
    if (screenIds.length === 0) return;
    try {
      const bindings = await deps.db.deviceBinding.findMany({
        where: { screenId: { in: [...new Set(screenIds)] }, unlinkedAt: null },
        select: { deviceId: true }
      });
      for (const { deviceId } of bindings) {
        deps.hub.publishToDevice(deviceId, {
          type: "rotation.updated",
          data: await buildDeviceState(deps, deviceId)
        });
      }
    } catch (err) {
      logger.error("rotation notify failed", { error: (err as Error).message });
    }
  };
}

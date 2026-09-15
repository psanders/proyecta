/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { DeviceState } from "@proyecta/common";
import type { DeviceSyncDeps } from "../screens/deps.js";

/**
 * The device's current state: link, screen name and the rotation to play — the screen's approved,
 * in-date ads, or the default rotation when it has none.
 */
export async function buildDeviceState(
  deps: DeviceSyncDeps,
  deviceId: string
): Promise<DeviceState> {
  const binding = await deps.db.deviceBinding.findFirst({
    where: { deviceId, unlinkedAt: null },
    include: { screen: { select: { id: true, name: true, resolution: true } } }
  });
  const now = (deps.now ?? (() => new Date()))();
  const rotation = binding
    ? ((await deps.loadScreenRotation(binding.screen, now)) ?? (await deps.loadRotation()))
    : null;
  return {
    linked: !!binding,
    screen: binding ? { id: binding.screen.id, name: binding.screen.name } : null,
    rotation,
    serverTime: now.toISOString()
  };
}

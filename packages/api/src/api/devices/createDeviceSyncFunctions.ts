/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  heartbeatSchema,
  playLogBatchSchema,
  withErrorHandlingAndValidation
} from "@proyecta/common";
import { logger } from "../../logger.js";
import type { DeviceSyncDeps } from "../screens/deps.js";
import { hashDeviceToken } from "./deviceToken.js";

/**
 * Creates a function that resolves a device from its bearer token (hash lookup), marking it as
 * seen. Resolves null for unknown or rotated-out tokens.
 *
 * @param deps - Injected database client and clock
 */
export function createAuthenticateDevice(deps: Pick<DeviceSyncDeps, "db" | "now">) {
  const now = deps.now ?? (() => new Date());
  return async (token: string | undefined): Promise<{ id: string } | null> => {
    if (!token) return null;
    const device = await deps.db.device.findUnique({
      where: { tokenHash: hashDeviceToken(token) },
      select: { id: true }
    });
    if (!device) return null;
    await deps.db.device.update({ where: { id: device.id }, data: { lastSeenAt: now() } });
    return device;
  };
}

/**
 * Creates a function that stores a device heartbeat (health shown on the screen detail) and pushes
 * a status update to the linked screen's workspace.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createRecordHeartbeat(deps: DeviceSyncDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = heartbeatSchema.extend({ deviceId: z.uuid() });

  const fn = async (params: z.infer<typeof schema>): Promise<{ ok: true }> => {
    const { deviceId, resolution, chromiumVersion, ...health } = params;
    const at = now();
    const device = await deps.db.device.update({
      where: { id: deviceId },
      data: {
        health,
        lastHeartbeatAt: at,
        lastSeenAt: at,
        ...(resolution ? { resolution } : {}),
        ...(chromiumVersion ? { chromiumVersion } : {})
      },
      include: { bindings: { where: { unlinkedAt: null }, include: { screen: true } } }
    });
    const screen = device.bindings[0]?.screen;
    if (screen)
      deps.hub.publishToWorkspace(screen.workspaceAccessKeyId, {
        screenId: screen.id,
        status: "ONLINE"
      });
    return { ok: true };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that stores a batch of plays idempotently, attributing each play to the
 * screen the device was linked to when it started (by link history).
 *
 * @param deps - Injected database client
 */
export function createRecordPlayLogs(deps: Pick<DeviceSyncDeps, "db">) {
  const schema = playLogBatchSchema.extend({ deviceId: z.uuid() });

  const fn = async (params: z.infer<typeof schema>): Promise<{ accepted: number }> => {
    const bindings = await deps.db.deviceBinding.findMany({
      where: { deviceId: params.deviceId },
      select: { screenId: true, linkedAt: true, unlinkedAt: true }
    });
    const screenAt = (startedAt: Date) =>
      bindings.find((b) => b.linkedAt <= startedAt && (!b.unlinkedAt || startedAt < b.unlinkedAt))
        ?.screenId ?? null;

    const { count } = await deps.db.playLog.createMany({
      data: params.plays.map((play) => {
        const startedAt = new Date(play.startedAt);
        return {
          deviceId: params.deviceId,
          screenId: screenAt(startedAt),
          itemId: play.itemId,
          codec: play.codec,
          result: play.result.toUpperCase() as "COMPLETED" | "STALLED" | "FAILED",
          startedAt,
          endedAt: new Date(play.endedAt)
        };
      }),
      skipDuplicates: true
    });
    logger.verbose("play logs recorded", {
      deviceId: params.deviceId,
      received: params.plays.length,
      stored: count
    });
    return { accepted: params.plays.length };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

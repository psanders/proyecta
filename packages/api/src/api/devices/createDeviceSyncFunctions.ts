/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  heartbeatSchema,
  playLogBatchSchema,
  unitsForDurationMs,
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates a function that stores a batch of plays idempotently, attributing each play to the
 * screen the device was linked to when it started (by link history), and pricing every completed
 * play under pay-per-display: the play's duration — as reported by the device, falling back to the
 * ad's file duration or a rotation lookup only when the device didn't report one (older players) —
 * converted to billed 5-second units, priced at the screen's rate snapshotted at this moment.
 * Plays of an advertiser's ad (item id = placement id) are attributed to the placement and the
 * advertiser business; when that business owns the screen the play is a house play: stored and
 * counted, never billed.
 *
 * @param deps - Injected database client and default-rotation loader
 */
export function createRecordPlayLogs(deps: Pick<DeviceSyncDeps, "db" | "loadRotation">) {
  const schema = playLogBatchSchema.extend({ deviceId: z.uuid() });

  const fn = async (params: z.infer<typeof schema>): Promise<{ accepted: number }> => {
    const bindings = await deps.db.deviceBinding.findMany({
      where: { deviceId: params.deviceId },
      select: { screenId: true, linkedAt: true, unlinkedAt: true }
    });
    const screenAt = (startedAt: Date) =>
      bindings.find((b) => b.linkedAt <= startedAt && (!b.unlinkedAt || startedAt < b.unlinkedAt))
        ?.screenId ?? null;

    const placementIds = [
      ...new Set(params.plays.map((play) => play.itemId).filter((id) => UUID.test(id)))
    ];
    const placements = placementIds.length
      ? await deps.db.adPlacement.findMany({
          where: { id: { in: placementIds } },
          select: {
            id: true,
            asset: { select: { durationMs: true } },
            ad: { select: { workspaceAccessKeyId: true } }
          }
        })
      : [];
    const placementFor = (itemId: string) => placements.find((p) => p.id === itemId);

    // Only load the default rotation when some completed non-ad play needs it as a fallback.
    const needsRotation = params.plays.some(
      (play) =>
        play.result === "completed" && play.durationMs === undefined && !placementFor(play.itemId)
    );
    const rotation = needsRotation ? await deps.loadRotation() : null;
    const configuredDurationFor = (itemId: string): number | undefined =>
      placementFor(itemId)?.asset.durationMs ??
      rotation?.items.find((item) => item.id === itemId)?.durationMs;

    const resolved = params.plays.map((play) => ({
      play,
      startedAt: new Date(play.startedAt),
      screenId: screenAt(new Date(play.startedAt))
    }));

    const screenIds = [...new Set(resolved.map((r) => r.screenId).filter((id) => id !== null))];
    const screens = screenIds.length
      ? await deps.db.screen.findMany({
          where: { id: { in: screenIds } },
          select: { id: true, ratePerFiveSecondsCents: true, workspaceAccessKeyId: true }
        })
      : [];
    const screenFor = (screenId: string | null) =>
      screenId ? screens.find((s) => s.id === screenId) : undefined;

    const { count } = await deps.db.playLog.createMany({
      data: resolved.map(({ play, startedAt, screenId }) => {
        const placement = placementFor(play.itemId);
        const advertiser = placement?.ad.workspaceAccessKeyId ?? null;
        const screen = screenFor(screenId);
        const house = !!advertiser && advertiser === screen?.workspaceAccessKeyId;
        // A duration the device reported is used as-is (even if invalid — no fallback); it's only
        // looked up when absent entirely.
        const durationMs = play.durationMs ?? configuredDurationFor(play.itemId);
        const billedUnits =
          play.result === "completed" && !house ? unitsForDurationMs(durationMs ?? null) : null;
        return {
          deviceId: params.deviceId,
          screenId,
          itemId: play.itemId,
          codec: play.codec,
          result: play.result.toUpperCase() as "COMPLETED" | "STALLED" | "FAILED",
          startedAt,
          endedAt: new Date(play.endedAt),
          billedUnits,
          rateCentsAtPlay: house ? null : (screen?.ratePerFiveSecondsCents ?? null),
          placementId: placement?.id ?? null,
          advertiserWorkspaceAccessKeyId: advertiser,
          house
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

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  checkPairingCodeSchema,
  linkDeviceSchema,
  normalizeResolution,
  screenIdSchema,
  withErrorHandlingAndValidation,
  type CodeAvailability
} from "@proyecta/common";
import { isRecentlySeen } from "../../events/status.js";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";
import type { DeviceSyncDeps } from "../screens/deps.js";
import { screenWithDevice, toScreenView, type ScreenView } from "../screens/views.js";
import { buildDeviceState } from "../devices/buildDeviceState.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Creates a function that tells whether a code belongs to a device that is online and free to link.
 * It never reveals which workspace holds a linked device.
 *
 * @param deps - Injected database client, event hub and clock
 */
export function createCheckPairingCode(deps: DeviceSyncDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = checkPairingCodeSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<CodeAvailability> => {
    const device = await deps.db.device.findUnique({
      where: { code: params.code },
      include: { bindings: { where: { unlinkedAt: null }, select: { id: true } } }
    });
    if (!device) return { available: false, reason: "NOT_FOUND" };
    if (device.bindings.length > 0) return { available: false, reason: "LINKED" };
    if (!isRecentlySeen(device.lastSeenAt, deps.hub.isStreamOpen(device.id), now())) {
      return { available: false, reason: "OFFLINE" };
    }
    return {
      available: true,
      resolution: device.resolution ? normalizeResolution(device.resolution) : null
    };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that links a device (by code) to an active screen of the workspace. The
 * database guarantees one open link per device and per screen, so concurrent attempts yield one
 * link. The device is notified immediately.
 *
 * @param deps - Injected database client, event hub, rotation loader and clock
 */
export function createLinkDevice(deps: DeviceSyncDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = linkDeviceSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenView> => {
    const at = now();
    const device = await deps.db.device.findUnique({ where: { code: params.code } });
    if (!device) throw new DomainError("NOT_FOUND", "errors.pairing.notFound");
    if (!isRecentlySeen(device.lastSeenAt, deps.hub.isStreamOpen(device.id), at)) {
      throw new DomainError("PRECONDITION_FAILED", "errors.pairing.offline");
    }
    const screen = await deps.db.screen.findFirst({
      where: {
        id: params.screenId,
        workspaceAccessKeyId: params.workspaceAccessKeyId,
        deletedAt: null
      }
    });
    if (!screen) throw new DomainError("NOT_FOUND", "errors.screen.notFound");
    if (screen.status === "ARCHIVED") {
      throw new DomainError("PRECONDITION_FAILED", "errors.screen.archivedLink");
    }

    try {
      await deps.db.deviceBinding.create({
        data: { deviceId: device.id, screenId: screen.id, linkedAt: at }
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DomainError("CONFLICT", "errors.pairing.alreadyLinked");
      }
      throw err;
    }
    // Resolution reported by the player fills an empty screen field, larger dimension first.
    if (!screen.resolution && device.resolution) {
      await deps.db.screen.update({
        where: { id: screen.id },
        data: { resolution: normalizeResolution(device.resolution) }
      });
    }
    logger.verbose("device linked", { deviceId: device.id, screenId: screen.id });

    deps.hub.publishToDevice(device.id, {
      type: "linked",
      data: await buildDeviceState(deps, device.id)
    });
    const row = await deps.db.screen.findUniqueOrThrow({
      where: { id: screen.id },
      include: screenWithDevice
    });
    const view = toScreenView(row, deps.hub, now());
    deps.hub.publishToWorkspace(params.workspaceAccessKeyId, {
      screenId: view.id,
      status: view.status
    });
    return view;
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that unlinks the device from a screen, keeping the link history. The device
 * is told right away (or learns on reconnect) and shows its same code again.
 *
 * @param deps - Injected database client, event hub, rotation loader and clock
 */
export function createUnlinkDevice(deps: DeviceSyncDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = screenIdSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<ScreenView> => {
    const screen = await deps.db.screen.findFirst({
      where: { id: params.id, workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null },
      include: { bindings: { where: { unlinkedAt: null } } }
    });
    if (!screen) throw new DomainError("NOT_FOUND", "errors.screen.notFound");
    const binding = screen.bindings[0];
    if (!binding) throw new DomainError("PRECONDITION_FAILED", "errors.screen.noDevice");

    await deps.db.deviceBinding.update({ where: { id: binding.id }, data: { unlinkedAt: now() } });
    logger.verbose("device unlinked", { deviceId: binding.deviceId, screenId: screen.id });

    deps.hub.publishToDevice(binding.deviceId, {
      type: "unlinked",
      data: await buildDeviceState(deps, binding.deviceId)
    });
    const row = await deps.db.screen.findUniqueOrThrow({
      where: { id: screen.id },
      include: screenWithDevice
    });
    const view = toScreenView(row, deps.hub, now());
    deps.hub.publishToWorkspace(params.workspaceAccessKeyId, {
      screenId: view.id,
      status: view.status
    });
    return view;
  };

  return withErrorHandlingAndValidation(fn, schema);
}

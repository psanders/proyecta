/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  generatePairingCode,
  registerDeviceSchema,
  withErrorHandlingAndValidation,
  type DeviceDbClient,
  type RegisterDeviceInput,
  type RegisterDeviceResult
} from "@proyecta/common";
import { logger } from "../../logger.js";
import { generateDeviceToken, hashDeviceToken } from "./deviceToken.js";

const MAX_CODE_ATTEMPTS = 5;

interface RegisterDeviceDeps {
  client: DeviceDbClient;
  generateCode?: () => string;
  generateToken?: () => string;
  now?: () => Date;
}

/** Postgres unique-constraint violation, as surfaced by Prisma. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/**
 * Creates a function that registers a physical device and returns its permanent pairing code and
 * a fresh device token. The same hardware id always gets the same code back, so reinstalls never
 * change it; every registration rotates the token (the previous one stops working).
 *
 * @param deps - Injected database client, code generator and clock
 * @returns A validated function that registers a device
 */
export function createRegisterDevice(deps: RegisterDeviceDeps) {
  const {
    client,
    generateCode = generatePairingCode,
    generateToken = generateDeviceToken,
    now = () => new Date()
  } = deps;

  const fn = async (params: RegisterDeviceInput): Promise<RegisterDeviceResult> => {
    logger.verbose("registering device", { shell: params.shell });

    const deviceToken = generateToken();
    const tokenHash = hashDeviceToken(deviceToken);

    const existing = await client.device.findUnique({ where: { hwId: params.hwId } });
    if (existing) {
      await client.device.update({
        where: { id: existing.id },
        data: {
          shell: params.shell,
          chromiumVersion: params.chromiumVersion ?? existing.chromiumVersion,
          resolution: params.resolution ?? existing.resolution,
          lastSeenAt: now(),
          tokenHash
        }
      });
      logger.verbose("device already registered", { id: existing.id });
      return { code: existing.code, deviceToken, created: false };
    }

    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      try {
        const device = await client.device.create({
          data: {
            code: generateCode(),
            hwId: params.hwId,
            shell: params.shell,
            chromiumVersion: params.chromiumVersion,
            resolution: params.resolution,
            tokenHash
          }
        });
        logger.verbose("device registered", { id: device.id });
        return { code: device.code, deviceToken, created: true };
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Either the code collided or the same hwId registered concurrently: re-check the hwId.
        const raced = await client.device.findUnique({ where: { hwId: params.hwId } });
        if (raced) {
          await client.device.update({
            where: { id: raced.id },
            data: { lastSeenAt: now(), tokenHash }
          });
          return { code: raced.code, deviceToken, created: false };
        }
      }
    }

    throw new Error("Could not allocate a unique pairing code");
  };

  return withErrorHandlingAndValidation(fn, registerDeviceSchema);
}

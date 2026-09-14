/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { ValidationError, type DeviceEvent } from "@proyecta/common";
import { buildDeviceState } from "../api/devices/buildDeviceState.js";
import {
  createAuthenticateDevice,
  createRecordHeartbeat,
  createRecordPlayLogs
} from "../api/devices/createDeviceSyncFunctions.js";
import { createRegisterDevice } from "../api/devices/index.js";
import type { DeviceSyncDeps } from "../api/screens/deps.js";
import { DomainError } from "../identity/errors.js";
import { logger } from "../logger.js";

const KEEP_ALIVE_MS = 25_000;

const HTTP_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412
};

type Handler = (req: Request, res: Response) => Promise<void>;
const route = (handler: Handler) => (req: Request, res: Response, next: NextFunction) =>
  handler(req, res).catch(next);

/**
 * The device protocol (/device/v1): a frozen, versioned HTTP + SSE contract spoken by players and
 * shells. Handlers stay thin and delegate to validated functions.
 */
export function createDeviceRouter(deps: DeviceSyncDeps): Router {
  const router = Router();
  const registerDevice = createRegisterDevice({ client: deps.db });
  const authenticate = createAuthenticateDevice(deps);
  const recordHeartbeat = createRecordHeartbeat(deps);
  const recordPlayLogs = createRecordPlayLogs(deps);

  router.post(
    "/register",
    route(async (req, res) => {
      res.json(await registerDevice(req.body));
    })
  );

  // Everything below requires the device token.
  router.use((req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    authenticate(header?.startsWith("Bearer ") ? header.slice(7) : undefined)
      .then((device) => {
        if (!device) {
          res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid device token" });
          return;
        }
        res.locals.deviceId = device.id;
        next();
      })
      .catch(next);
  });

  router.get(
    "/state",
    route(async (_req, res) => {
      res.json(await buildDeviceState(deps, res.locals.deviceId as string));
    })
  );

  router.get(
    "/events",
    route(async (req, res) => {
      const deviceId = res.locals.deviceId as string;
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      const send = (event: DeviceEvent) =>
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);

      const closeStream = deps.hub.openStream(deviceId);
      const unsubscribe = deps.hub.subscribeDevice(deviceId, send);
      send({ type: "state", data: await buildDeviceState(deps, deviceId) });
      await announceStatus(deps, deviceId);

      const keepAlive = setInterval(() => {
        res.write(": keep-alive\n\n");
        void deps.db.device
          .update({
            where: { id: deviceId },
            data: { lastSeenAt: (deps.now ?? (() => new Date()))() }
          })
          .catch(() => undefined);
      }, KEEP_ALIVE_MS);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
        closeStream();
        logger.verbose("device stream closed", { deviceId });
      });
    })
  );

  router.post(
    "/heartbeat",
    route(async (req, res) => {
      res.json(await recordHeartbeat({ ...req.body, deviceId: res.locals.deviceId }));
    })
  );

  router.post(
    "/play-logs",
    route(async (req, res) => {
      res.json(await recordPlayLogs({ ...req.body, deviceId: res.locals.deviceId }));
    })
  );

  router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof ValidationError) {
      res.status(400).json({ code: err.code, errors: err.fieldErrors });
      return;
    }
    if (err instanceof DomainError) {
      res.status(HTTP_STATUS[err.code] ?? 500).json({ code: err.code, message: err.message });
      return;
    }
    logger.error("device protocol error", { error: (err as Error).message });
    res.status(500).json({ code: "INTERNAL_SERVER_ERROR" });
  });

  return router;
}

/** Tells the linked screen's workspace that its device just came online. */
async function announceStatus(deps: DeviceSyncDeps, deviceId: string): Promise<void> {
  const binding = await deps.db.deviceBinding.findFirst({
    where: { deviceId, unlinkedAt: null },
    include: { screen: { select: { id: true, workspaceAccessKeyId: true } } }
  });
  if (binding) {
    deps.hub.publishToWorkspace(binding.screen.workspaceAccessKeyId, {
      screenId: binding.screen.id,
      status: "ONLINE"
    });
  }
}

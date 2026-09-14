/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { ValidationError, type DeviceDbClient } from "@proyecta/common";
import { createRegisterDevice } from "../api/devices/index.js";

/**
 * The device protocol: a frozen, versioned HTTP contract spoken by players and shells.
 * Handlers stay thin and delegate to validated functions.
 */
export function createDeviceRouter(client: DeviceDbClient): Router {
  const router = Router();
  const registerDevice = createRegisterDevice({ client });

  router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await registerDevice(req.body));
    } catch (err) {
      next(err);
    }
  });

  router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ code: err.code, errors: err.fieldErrors });
      return;
    }
    next(err);
  });

  return router;
}

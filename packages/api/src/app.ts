/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { DeviceDbClient } from "@proyecta/common";
import { createDevRouter } from "./dev/router.js";
import { createDeviceRouter } from "./device/router.js";
import { appRouter } from "./trpc/router.js";

export interface AppOptions {
  /** When set (dev only), serves the demo rotation from this directory under /dev. */
  devMediaDir?: string;
}

/** Builds the HTTP app: tRPC for the dashboard, /device/v1 for players. */
export function createApp(client: DeviceDbClient, options: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/device/v1", createDeviceRouter(client));
  if (options.devMediaDir) app.use("/dev", createDevRouter(options.devMediaDir));
  app.use("/trpc", createExpressMiddleware({ router: appRouter, createContext: () => ({}) }));
  return app;
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createDeviceRouter } from "./device/router.js";
import { resolveContext, type Services } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

export interface AppOptions {
  /** Serves the default rotation's media (generated demo ads) at /media when set. */
  mediaDir?: string;
}

/** Builds the HTTP app: tRPC for the dashboard, /device/v1 for players, /media for content. */
export function createApp(services: Services, options: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/device/v1", createDeviceRouter(services.sync));
  // express.static answers Range requests, which video elements rely on.
  if (options.mediaDir) app.use("/media", express.static(options.mediaDir, { maxAge: "1h" }));
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, info }) =>
        resolveContext(
          services,
          req.headers,
          info.connectionParams as Record<string, string> | null
        )
    })
  );
  return app;
}

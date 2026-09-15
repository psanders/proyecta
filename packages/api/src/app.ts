/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createDeviceRouter } from "./device/router.js";
import { CONTENT_URL_PREFIX } from "./media/contentStore.js";
import { resolveContext, type Services } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { createUploadRouter } from "./uploads/router.js";

export interface AppOptions {
  /** Serves the default rotation's media (generated demo ads) at /media when set. */
  mediaDir?: string;
  /** Serves uploaded content and its renditions at /content when set. */
  contentDir?: string;
}

/**
 * Builds the HTTP app: tRPC for the dashboard, /device/v1 for players, /uploads for files, and
 * /media + /content for playable content.
 */
export function createApp(services: Services, options: AppOptions = {}): Express {
  const app = express();
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });
  // Uploads stream their raw body, so they're mounted before the JSON body parser.
  app.use("/uploads", createUploadRouter(services));
  app.use(express.json({ limit: "1mb" }));
  app.use("/device/v1", createDeviceRouter(services.sync));
  // express.static answers Range requests, which video elements rely on.
  if (options.mediaDir) app.use("/media", express.static(options.mediaDir, { maxAge: "1h" }));
  // Asset files never change once written (a new file is a new asset), so they cache for long.
  if (options.contentDir) {
    app.use(CONTENT_URL_PREFIX, express.static(options.contentDir, { maxAge: "7d" }));
  }
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

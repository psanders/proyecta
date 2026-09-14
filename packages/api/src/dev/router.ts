/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import express, { Router } from "express";

/**
 * DEV ONLY. Serves the generated demo rotation (scripts/generate-demo-ads.sh) so the player can be
 * tested before the device protocol exists. Not part of /device/v1 and never mounted in production.
 */
export function createDevRouter(mediaDir: string): Router {
  const router = Router();

  router.get("/manifest", (_req, res) => {
    const file = join(mediaDir, "manifest.json");
    if (!existsSync(file)) {
      res.status(404).json({ code: "NO_DEMO_MEDIA", message: "Run scripts/generate-demo-ads.sh" });
      return;
    }
    // `root` keeps send's dotfile guard from rejecting the absolute ".data" path.
    res.set("Cache-Control", "no-store").sendFile("manifest.json", { root: mediaDir });
  });

  // express.static answers Range requests, which video elements rely on.
  router.use("/media", express.static(mediaDir, { maxAge: "1h", immutable: false }));

  return router;
}

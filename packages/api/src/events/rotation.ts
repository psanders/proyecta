/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { manifestSchema, type Manifest } from "@proyecta/common";
import { logger } from "../logger.js";

export type RotationLoader = () => Promise<Manifest | null>;

/**
 * Loads the default rotation every linked screen plays (the generated demo ads) from
 * `<mediaDir>/manifest.json`, re-reading it only when the file changes.
 */
export function createRotationLoader(mediaDir: string): RotationLoader {
  const file = join(mediaDir, "manifest.json");
  let cached: { mtimeMs: number; manifest: Manifest | null } | undefined;

  return async () => {
    try {
      const { mtimeMs } = await stat(file);
      if (cached?.mtimeMs === mtimeMs) return cached.manifest;
      const parsed = manifestSchema.safeParse(JSON.parse(await readFile(file, "utf8")));
      if (!parsed.success) logger.warn("default rotation manifest is invalid", { file });
      cached = { mtimeMs, manifest: parsed.success ? parsed.data : null };
      return cached.manifest;
    } catch {
      return null;
    }
  };
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { copyFile, mkdir, rename, rm, unlink } from "node:fs/promises";
import { join } from "node:path";

/** URL path prefix the API serves uploaded content under. */
export const CONTENT_URL_PREFIX = "/content";

/** Where uploaded files and their renditions live: one directory per asset. */
export interface ContentStore {
  /** Absolute directory of an asset. */
  dirFor(assetId: string): string;
  /** Public URL path of a file inside an asset's directory. */
  urlFor(assetId: string, file: string): string;
  /** Moves an uploaded temp file into the asset's directory; returns the stored file name. */
  importSource(tempPath: string, assetId: string, extension: string): Promise<string>;
  /** Deletes an asset's directory and everything in it. */
  remove(assetId: string): Promise<void>;
}

/** A content store on the local disk under `root`, served at {@link CONTENT_URL_PREFIX}. */
export function createContentStore(root: string): ContentStore {
  const dirFor = (assetId: string) => join(root, assetId);
  return {
    dirFor,
    urlFor: (assetId, file) => `${CONTENT_URL_PREFIX}/${assetId}/${file}`,
    async importSource(tempPath, assetId, extension) {
      const dir = dirFor(assetId);
      await mkdir(dir, { recursive: true });
      const file = `source.${extension}`;
      try {
        await rename(tempPath, join(dir, file));
      } catch {
        // Temp dir on another device: copy, then remove the temp file.
        await copyFile(tempPath, join(dir, file));
        await unlink(tempPath).catch(() => undefined);
      }
      return file;
    },
    remove: (assetId) => rm(dirFor(assetId), { recursive: true, force: true })
  };
}

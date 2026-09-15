/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { join } from "node:path";
import type { AssetRenditions } from "@proyecta/common";
import type { DbClient } from "../db.js";
import { logger } from "../logger.js";
import type { ContentStore } from "./contentStore.js";
import type { RenditionRenderer } from "./ffmpeg.js";

export interface RenditionQueue {
  /** Prepares an asset's renditions in the background. */
  enqueue(assetId: string): void;
  /** Re-enqueues assets left preparing (e.g. by a restart). */
  resume(): Promise<void>;
  /** Resolves when everything enqueued so far has finished (for tests). */
  idle(): Promise<void>;
}

/**
 * Creates an in-process queue that prepares asset renditions one at a time: a ready asset gets its
 * rendition URLs, a failure marks the asset failed. Transcoding is CPU-heavy, so concurrency is 1.
 *
 * @param deps - Injected database client, content store and renderer
 */
export function createRenditionQueue(deps: {
  db: Pick<DbClient, "asset">;
  store: ContentStore;
  render: RenditionRenderer;
}): RenditionQueue {
  let tail: Promise<void> = Promise.resolve();

  const prepare = async (assetId: string) => {
    const asset = await deps.db.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PROCESSING") return;
    const dir = deps.store.dirFor(asset.id);
    try {
      const files = await deps.render({
        source: join(dir, asset.sourceFile),
        dir,
        kind: asset.kind,
        width: asset.width,
        height: asset.height
      });
      const renditions: AssetRenditions = Object.fromEntries(
        Object.entries(files).map(([key, file]) => [key, deps.store.urlFor(asset.id, file!)])
      );
      await deps.db.asset.update({
        where: { id: asset.id },
        data: { status: "READY", renditions: { ...renditions } }
      });
      logger.verbose("asset renditions ready", { assetId });
    } catch (err) {
      logger.error("asset renditions failed", { assetId, error: (err as Error).message });
      await deps.db.asset.update({
        where: { id: asset.id },
        data: { status: "FAILED", failureReason: (err as Error).message.slice(0, 500) }
      });
    }
  };

  return {
    enqueue(assetId) {
      tail = tail.then(() => prepare(assetId)).catch(() => undefined);
    },
    async resume() {
      const pending = await deps.db.asset.findMany({
        where: { status: "PROCESSING" },
        select: { id: true },
        orderBy: { createdAt: "asc" }
      });
      for (const { id } of pending) this.enqueue(id);
    },
    idle: () => tail
  };
}

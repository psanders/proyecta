/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import {
  MIN_SHORT_SIDE_PX,
  assetIdSchema,
  assetKindForType,
  billableVideoDurationMs,
  extensionForType,
  orientationFor,
  uploadAssetSchema,
  withErrorHandlingAndValidation,
  type AssetRenditions,
  type AssetView
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";
import type { ContentStore } from "../../media/contentStore.js";
import type { MediaProbe } from "../../media/ffmpeg.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };

export interface AssetDeps {
  db: Pick<DbClient, "asset" | "adPlacement">;
  store: ContentStore;
}

type AssetRow = Prisma.AssetGetPayload<{ include: { _count: { select: { placements: true } } } }>;

/** Shapes an asset row for the dashboard. */
export function toAssetView(row: AssetRow): AssetView {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    durationMs: row.durationMs,
    width: row.width,
    height: row.height,
    orientation: row.orientation,
    sizeBytes: row.sizeBytes,
    renditions: (row.renditions ?? {}) as AssetRenditions,
    inUse: row._count.placements > 0,
    createdAt: row.createdAt.toISOString()
  };
}

const withUsage = { _count: { select: { placements: true } } } as const;

/**
 * Creates a function that accepts an uploaded file into a business's library after the automated
 * checks: it must read as the declared kind of media, a video must last 5–60 s within half a
 * second of a 5-second multiple, and the shorter side must be at least 480 px. The accepted file
 * is stored and its renditions are prepared in the background.
 *
 * @param deps - Injected database client, content store, media probe and rendition queue
 */
export function createUploadAsset(
  deps: AssetDeps & { probe: MediaProbe; enqueue: (assetId: string) => void }
) {
  const schema = uploadAssetSchema.and(
    z.object({ ...scoped, tempPath: z.string().min(1), sha256: z.string().length(64) })
  );

  const fn = async (params: z.infer<typeof schema>): Promise<AssetView> => {
    const declared = assetKindForType(params.contentType)!;
    const media = await deps.probe(params.tempPath);
    if (!media || media.kind !== declared) {
      throw new DomainError("BAD_REQUEST", "errors.asset.unreadable");
    }
    let durationMs = params.durationMs ?? 0;
    if (media.kind === "VIDEO") {
      const billable = billableVideoDurationMs(media.durationSec ?? 0);
      if (billable === null) throw new DomainError("BAD_REQUEST", "errors.asset.videoDuration");
      durationMs = billable;
    }
    if (Math.min(media.width, media.height) < MIN_SHORT_SIDE_PX) {
      throw new DomainError("BAD_REQUEST", "errors.asset.tooSmall");
    }

    const id = randomUUID();
    const sourceFile = await deps.store.importSource(
      params.tempPath,
      id,
      extensionForType(params.contentType)
    );
    const row = await deps.db.asset.create({
      data: {
        id,
        workspaceAccessKeyId: params.workspaceAccessKeyId,
        name: params.name,
        kind: media.kind,
        durationMs,
        width: media.width,
        height: media.height,
        orientation: orientationFor(media.width, media.height),
        sourceFile,
        sizeBytes: params.sizeBytes,
        sha256: params.sha256
      },
      include: withUsage
    });
    deps.enqueue(id);
    logger.verbose("asset uploaded", { id, kind: media.kind, durationMs });
    return toAssetView(row);
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that lists a business's assets, newest first.
 *
 * @param deps - Injected database client
 */
export function createListAssets(deps: Pick<AssetDeps, "db">) {
  const schema = z.object(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<AssetView[]> => {
    const rows = await deps.db.asset.findMany({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId },
      include: withUsage,
      orderBy: { createdAt: "desc" }
    });
    return rows.map(toAssetView);
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that deletes an asset and its files, refused once any ad has used it.
 *
 * @param deps - Injected database client and content store
 */
export function createDeleteAsset(deps: AssetDeps) {
  const schema = assetIdSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const asset = await deps.db.asset.findFirst({
      where: { id: params.id, workspaceAccessKeyId: params.workspaceAccessKeyId },
      include: withUsage
    });
    if (!asset) throw new DomainError("NOT_FOUND", "errors.asset.notFound");
    if (asset._count.placements > 0) {
      throw new DomainError("PRECONDITION_FAILED", "errors.asset.inUse");
    }
    await deps.db.asset.delete({ where: { id: asset.id } });
    await deps.store.remove(asset.id);
    logger.verbose("asset deleted", { id: asset.id });
    return { id: asset.id };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Router, type Request, type Response } from "express";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { assetKindForType, canManage, maxBytesFor, MAX_VIDEO_BYTES } from "@proyecta/common";
import { createUploadAsset } from "../api/assets/createAssetFunctions.js";
import { DomainError, toTRPCError } from "../identity/errors.js";
import { logger } from "../logger.js";
import { resolveContext, type Services } from "../trpc/context.js";
import { localizeError } from "../trpc/trpc.js";

class TooLarge extends Error {}

/** Sends an error in the same JSON shape tRPC uses, so the dashboard reads it the same way. */
function sendError(res: Response, err: unknown, language: Parameters<typeof localizeError>[2]) {
  const error = err instanceof TRPCError ? err : toTRPCError(err);
  if (error.code === "INTERNAL_SERVER_ERROR") {
    logger.error("upload failed", { error: (error.cause as Error | undefined)?.message });
  }
  const { message, fieldErrors } = localizeError(error, error.message, language);
  const httpStatus = getHTTPStatusCodeFromError(error);
  res.status(httpStatus).json({
    error: {
      message,
      code: TRPC_ERROR_CODES_BY_KEY[error.code],
      data: { code: error.code, httpStatus, fieldErrors }
    }
  });
}

/**
 * Uploads over plain HTTP (tRPC has no streaming uploads): `POST /uploads/assets` with the raw file
 * as the body, its MIME type as Content-Type and `name` / `fileName` / `durationMs` as query
 * parameters. Authenticated like the dashboard API (bearer token + x-workspace, admins and
 * owners only). The body streams to a temp file with a size cap; checks run on the stored file.
 */
export function createUploadRouter(services: Services): Router {
  const router = Router();

  router.post("/assets", async (req: Request, res: Response) => {
    const ctx = await resolveContext(services, req.headers);
    const tempPath = join(services.media.tempDir, `upload-${randomUUID()}`);
    try {
      if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (!ctx.workspace) throw new DomainError("FORBIDDEN", "errors.forbidden.member");
      if (!canManage(ctx.workspace.role))
        throw new DomainError("FORBIDDEN", "errors.forbidden.admin");

      const contentType = req.headers["content-type"] ?? "";
      const kind = assetKindForType(contentType);
      const limit = kind ? maxBytesFor(kind) : MAX_VIDEO_BYTES;
      const declared = Number(req.headers["content-length"]);
      if (Number.isFinite(declared) && declared > limit) {
        throw new DomainError("BAD_REQUEST", "errors.asset.tooLarge");
      }

      await mkdir(services.media.tempDir, { recursive: true });
      const hash = createHash("sha256");
      let size = 0;
      const meter = new Transform({
        transform(chunk: Buffer, _encoding, done) {
          size += chunk.length;
          if (size > limit) return done(new TooLarge());
          hash.update(chunk);
          done(null, chunk);
        }
      });
      try {
        await pipeline(req, meter, createWriteStream(tempPath));
      } catch (err) {
        if (err instanceof TooLarge) throw new DomainError("BAD_REQUEST", "errors.asset.tooLarge");
        throw err;
      }

      const query = req.query as Record<string, string | undefined>;
      const fileName = (query.fileName ?? "").replace(/\.[^.]+$/, "");
      const asset = await createUploadAsset({
        db: services.sync.db,
        store: services.media.store,
        probe: services.media.probe,
        enqueue: (id) => services.media.queue.enqueue(id)
      })({
        workspaceAccessKeyId: ctx.workspace.accessKeyId,
        name: query.name?.trim() || fileName,
        contentType,
        sizeBytes: size,
        durationMs: query.durationMs,
        tempPath,
        sha256: hash.digest("hex")
      });
      res.status(201).json({ asset });
    } catch (err) {
      req.resume();
      sendError(res, err, ctx.language);
    } finally {
      // Accepted uploads were moved into the content store; anything left here is discarded.
      await unlink(tempPath).catch(() => undefined);
    }
  });

  return router;
}

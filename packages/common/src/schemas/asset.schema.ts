/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import type { Orientation } from "./screen.schema.js";

export const ASSET_KINDS = ["IMAGE", "VIDEO"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const ASSET_STATUSES = ["PROCESSING", "READY", "FAILED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Accepted upload types and the file extension each is stored with. */
export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
} as const;
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
} as const;

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
/** Display durations an advertiser can choose for an image. */
export const IMAGE_DURATIONS_MS = [5000, 10000, 15000] as const;
export const MIN_VIDEO_MS = 5000;
export const MAX_VIDEO_MS = 60000;
/** How far a video's real length may be from a 5-second multiple and still be accepted. */
export const VIDEO_DURATION_TOLERANCE_MS = 500;
export const MIN_SHORT_SIDE_PX = 480;

/** The media kind for an accepted MIME type, or null when the type isn't accepted. */
export function assetKindForType(contentType: string | undefined): AssetKind | null {
  const type = (contentType ?? "").split(";")[0]!.trim().toLowerCase();
  if (Object.hasOwn(VIDEO_TYPES, type)) return "VIDEO";
  if (Object.hasOwn(IMAGE_TYPES, type)) return "IMAGE";
  return null;
}

/** The stored file extension for an accepted MIME type. */
export function extensionForType(contentType: string): string {
  const type = contentType.split(";")[0]!.trim().toLowerCase();
  return (
    (VIDEO_TYPES as Record<string, string>)[type] ??
    (IMAGE_TYPES as Record<string, string>)[type] ??
    "bin"
  );
}

/** The upload size limit, in bytes, for a media kind. */
export function maxBytesFor(kind: AssetKind): number {
  return kind === "VIDEO" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/**
 * A video's billable duration: its length rounded to the nearest 5 seconds, when that is within
 * {@link VIDEO_DURATION_TOLERANCE_MS} of the real length and between 5 and 60 seconds; otherwise null.
 */
export function billableVideoDurationMs(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const ms = seconds * 1000;
  const rounded = Math.round(ms / 5000) * 5000;
  if (Math.abs(ms - rounded) > VIDEO_DURATION_TOLERANCE_MS) return null;
  if (rounded < MIN_VIDEO_MS || rounded > MAX_VIDEO_MS) return null;
  return rounded;
}

/** Landscape when the width is at least the height. */
export function orientationFor(width: number, height: number): Orientation {
  return width >= height ? "LANDSCAPE" : "PORTRAIT";
}

/**
 * Upload metadata (the file itself is the request body). `durationMs` is required for images and
 * ignored for videos, whose duration comes from the file.
 */
export const uploadAssetSchema = z
  .object({
    name: z
      .string({ error: "validation.assetName.required" })
      .trim()
      .min(1, "validation.assetName.required")
      .max(80, "validation.assetName.max"),
    contentType: z
      .string({ error: "validation.asset.format" })
      .refine((type) => assetKindForType(type) !== null, "validation.asset.format"),
    sizeBytes: z.number().int().positive("validation.asset.empty"),
    durationMs: z.coerce.number().int().optional()
  })
  .superRefine((value, ctx) => {
    const kind = assetKindForType(value.contentType);
    if (!kind) return;
    if (value.sizeBytes > maxBytesFor(kind)) {
      ctx.addIssue({ code: "custom", path: ["file"], message: "validation.asset.tooLarge" });
    }
    if (
      kind === "IMAGE" &&
      !(IMAGE_DURATIONS_MS as readonly number[]).includes(value.durationMs ?? -1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["durationMs"],
        message: "validation.asset.imageDuration"
      });
    }
  });

export const assetIdSchema = z.object({ id: z.uuid({ error: "validation.asset.invalid" }) });

export type UploadAssetInput = z.infer<typeof uploadAssetSchema>;

/** Player renditions of an asset, as URL paths served by the API. */
export interface AssetRenditions {
  webp?: string;
  webm?: string;
  mp4?: string;
  /** A still for dashboards (the image itself, or a video frame). */
  poster?: string;
}

export interface AssetView {
  id: string;
  name: string;
  kind: AssetKind;
  status: AssetStatus;
  durationMs: number;
  width: number;
  height: number;
  orientation: Orientation;
  sizeBytes: number;
  renditions: AssetRenditions;
  /** True once any ad has used the file (it can't be deleted then). */
  inUse: boolean;
  createdAt: string;
}

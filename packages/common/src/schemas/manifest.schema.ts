/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";

/**
 * Playback manifest: what a screen should rotate, in order.
 * PROVISIONAL: served by the dev demo today; the device-protocol change formalizes it
 * (versioning, hashes for atomic swaps, per-screen delivery).
 */
export const renditionsSchema = z.object({
  webm: z.string().min(1).optional(),
  mp4: z.string().min(1).optional(),
  webp: z.string().min(1).optional()
});

export const manifestItemSchema = z
  .object({
    id: z.string().min(1, "Item id is required"),
    type: z.enum(["image", "video"], { error: "Item type must be image or video" }),
    advertiser: z.string().min(1, "Advertiser is required"),
    title: z.string().min(1, "Title is required"),
    durationMs: z.number().int().min(1000, "Items must last at least 1 second"),
    renditions: renditionsSchema
  })
  .refine(
    (item) =>
      item.type === "image"
        ? !!item.renditions.webp
        : !!(item.renditions.webm || item.renditions.mp4),
    {
      message: "Images need a webp rendition; videos need webm or mp4",
      path: ["renditions"]
    }
  );

export const manifestSchema = z.object({
  version: z.string().min(1, "Manifest version is required"),
  name: z.string().min(1, "Rotation name is required"),
  screenName: z.string().min(1, "Screen name is required"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  items: z.array(manifestItemSchema).min(1, "A manifest needs at least one item")
});

export type Renditions = z.infer<typeof renditionsSchema>;
export type ManifestItem = z.infer<typeof manifestItemSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * /device/v1 contract. FROZEN: only additive, backward-compatible changes.
 */
import { z } from "zod/v4";
import { manifestSchema } from "./manifest.schema.js";

export const registerDeviceResponseSchema = z.object({
  code: z.string(),
  deviceToken: z.string(),
  created: z.boolean()
});

export const deviceStateSchema = z.object({
  linked: z.boolean(),
  screen: z.object({ id: z.string(), name: z.string() }).nullable(),
  rotation: manifestSchema.nullable(),
  serverTime: z.iso.datetime()
});

export const deviceEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state"), data: deviceStateSchema }),
  z.object({ type: z.literal("linked"), data: deviceStateSchema }),
  z.object({ type: z.literal("unlinked"), data: deviceStateSchema }),
  z.object({ type: z.literal("rotation.updated"), data: deviceStateSchema })
]);

export const heartbeatSchema = z.object({
  playerVersion: z.string().max(32),
  uptimeSec: z.number().int().min(0),
  currentItemId: z.string().max(120).optional(),
  codec: z.string().max(16).optional(),
  resolution: z
    .string()
    .regex(/^\d{2,5}x\d{2,5}$/)
    .optional(),
  chromiumVersion: z.string().max(32).optional(),
  memoryUsedMb: z.number().min(0).optional(),
  memoryTotalMb: z.number().min(0).optional(),
  storageUsedMb: z.number().min(0).optional(),
  storageQuotaMb: z.number().min(0).optional()
});

export const playLogBatchSchema = z.object({
  plays: z
    .array(
      z.object({
        itemId: z.string().min(1).max(120),
        codec: z.string().min(1).max(16),
        result: z.enum(["completed", "stalled", "failed"]),
        startedAt: z.iso.datetime(),
        endedAt: z.iso.datetime(),
        /**
         * Additive (v0.2 of the play-log batch): the ad's planned duration in ms, as the player
         * knows it. Deliberately unconstrained beyond "a plain integer" here — a zero, negative,
         * or non-multiple-of-5000 value still gets the play stored, just not billed; see the
         * `accounting` capability. Absent on older players, which fall back to a server-side
         * rotation lookup.
         */
        durationMs: z.number().int().optional()
      })
    )
    .min(1)
    .max(500)
});

export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponseSchema>;
export type DeviceState = z.infer<typeof deviceStateSchema>;
export type DeviceEvent = z.infer<typeof deviceEventSchema>;
export type Heartbeat = z.infer<typeof heartbeatSchema>;
export type PlayLogBatch = z.infer<typeof playLogBatchSchema>;

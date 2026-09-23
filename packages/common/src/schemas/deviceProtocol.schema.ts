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

export const cpuScopeSchema = z.enum(["system", "process"]);

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
  /** CPU load 0–100, when the shell can measure it (browsers can't). Scope in `cpuScope`. */
  cpuPercent: z.number().min(0).max(100).optional(),
  /** Device RAM, reported by a native shell only. Never the page's JS heap. */
  memoryUsedMb: z.number().min(0).optional(),
  memoryTotalMb: z.number().min(0).optional(),
  /** The player's own cache (origin usage) and the quota the engine grants it; not the disk. */
  storageUsedMb: z.number().min(0).optional(),
  storageQuotaMb: z.number().min(0).optional(),
  // Additive (player-shells). All optional so older players stay valid.
  shellVersion: z.string().max(32).optional(),
  deviceModel: z.string().max(80).optional(),
  osVersion: z.string().max(40).optional(),
  cpuCores: z.number().int().min(1).max(1024).optional(),
  /** Whether `cpuPercent` covers the whole device or only the player app's process. */
  cpuScope: cpuScopeSchema.optional(),
  /** Browser-only approximation (`navigator.deviceMemory`, bucketed, capped at 8). */
  deviceMemoryApproxGb: z.number().min(0).max(1024).optional(),
  /** The storage volume holding the player's data; shells only. */
  diskUsedMb: z.number().min(0).optional(),
  diskTotalMb: z.number().min(0).optional(),
  /** The player page's JS heap, for leak detection. Never shown as RAM. */
  jsHeapUsedMb: z.number().min(0).optional()
});

/** What a native shell tells the player about itself (Android bridge `info()`, kiosk `/shell/info`). */
export const shellInfoSchema = z.object({
  shell: z.enum(["ANDROID", "KIOSK_LINUX", "KIOSK_WINDOWS"]),
  version: z.string().min(1).max(32),
  hwId: z.string().min(1).max(200).optional(),
  deviceModel: z.string().max(80).optional(),
  osVersion: z.string().max(40).optional(),
  cpuCores: z.number().int().min(1).max(1024).optional(),
  webviewVersion: z.string().max(32).optional()
});

/** Live figures from a native shell (Android bridge `metrics()`, kiosk `/shell/metrics`). */
export const shellMetricsSchema = z.object({
  cpuPercent: z.number().min(0).max(100).optional(),
  cpuScope: cpuScopeSchema.optional(),
  memoryUsedMb: z.number().min(0).optional(),
  memoryTotalMb: z.number().min(0).optional(),
  diskUsedMb: z.number().min(0).optional(),
  diskTotalMb: z.number().min(0).optional()
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
export type ShellInfo = z.infer<typeof shellInfoSchema>;
export type ShellMetrics = z.infer<typeof shellMetricsSchema>;

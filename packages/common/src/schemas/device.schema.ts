/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { isPairingCode, normalizePairingCode } from "../utils/pairingCode.js";

/** Which shell is running the player core. */
export const deviceShellSchema = z.enum(["ANDROID", "KIOSK_LINUX", "KIOSK_WINDOWS", "BROWSER"], {
  error: "Unknown device shell"
});

/**
 * Body of POST /device/v1/register.
 * The hardware id (ANDROID_ID, /etc/machine-id, MachineGuid) is what makes the code permanent.
 */
export const registerDeviceSchema = z.object({
  hwId: z
    .string({ error: "Hardware id is required" })
    .trim()
    .min(8, "Hardware id is too short")
    .max(128, "Hardware id is too long"),
  shell: deviceShellSchema,
  chromiumVersion: z.string().trim().max(32, "Chromium version is too long").optional(),
  resolution: z
    .string()
    .trim()
    .regex(/^\d{2,5}x\d{2,5}$/, "Resolution must look like 1920x1080")
    .optional(),
  playerVersion: z.string().trim().max(32, "Player version is too long").optional()
});

/** A pairing code as typed by a person: forgiving on case and dashes, strict on content. */
export const pairingCodeSchema = z
  .string({ error: "Pairing code is required" })
  .transform(normalizePairingCode)
  .refine(isPairingCode, "Pairing code must be 8 characters, like 8F3K-2QLM");

export type DeviceShell = z.infer<typeof deviceShellSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

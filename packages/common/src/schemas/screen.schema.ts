/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { pairingCodeSchema } from "./device.schema.js";

export const PLACE_TYPES = [
  "BILLBOARD",
  "MALL",
  "RESTAURANT",
  "SUPERMARKET",
  "HEALTH",
  "TRANSIT",
  "GYM",
  "OFFICE",
  "EDUCATION",
  "HOTEL",
  "OTHER"
] as const;

// Labels for these values live in the dashboard's message catalog (Spanish and English).
export const ENVIRONMENTS = ["INDOOR", "OUTDOOR"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];
export const ORIENTATIONS = ["LANDSCAPE", "PORTRAIT"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

/** Suggestions for the city field (free text is still allowed). */
export const DR_CITIES = [
  "Santo Domingo",
  "Santiago",
  "Puerto Plata",
  "Punta Cana",
  "La Romana",
  "San Pedro de Macorís",
  "La Vega",
  "San Francisco de Macorís",
  "Higüey",
  "Bávaro",
  "Moca",
  "San Cristóbal",
  "Baní",
  "Samaná",
  "Boca Chica",
  "Barahona"
] as const;

export const SCREEN_STATUS_VIEWS = ["ONLINE", "STALE", "OFFLINE", "UNLINKED"] as const;
export type ScreenStatusView = (typeof SCREEN_STATUS_VIEWS)[number];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.time.format");
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const CENTS_PER_DOLLAR = 100;

/**
 * Converts a validated pay-per-display rate from US dollars into integer US$ cents, e.g.
 * `2.5 -> 250`. A plain function, not a schema `.transform()`: this codebase re-validates
 * mutation input against the same schema both at the tRPC boundary and again inside the
 * validated function (see `withErrorHandlingAndValidation`), so a schema-level transform would
 * run twice and double-convert. Callers apply this exactly once, at the point of writing to the
 * database.
 */
export function rateDollarsToCents(dollars: number): number {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

/**
 * Pay-per-display rate, in US dollars with cent precision (converted to cents with
 * {@link rateDollarsToCents} before it's persisted). Comparing `dollars * 100` to its rounded value
 * (with a small float tolerance) rather than `% 0.01` avoids float-precision false rejections for
 * an exact cent amount like 2.50.
 */
const ratePerFiveSecondsDollars = z
  .number({ error: "validation.rate.required" })
  .min(0, "validation.rate.negative")
  .max(1_000_000, "validation.rate.tooHigh")
  .refine((dollars) => {
    const cents = dollars * CENTS_PER_DOLLAR;
    return Math.abs(cents - Math.round(cents)) < 1e-6;
  }, "validation.rate.decimals")
  .optional();

const screenFieldsSchema = z.object({
  name: z
    .string({ error: "validation.screenName.required" })
    .trim()
    .min(1, "validation.screenName.required")
    .max(80, "validation.screenName.max"),
  city: z
    .string({ error: "validation.city.required" })
    .trim()
    .min(1, "validation.city.required")
    .max(60, "validation.city.max"),
  placeType: z.enum(PLACE_TYPES, { error: "validation.placeType.invalid" }).optional(),
  environment: z.enum(ENVIRONMENTS, { error: "validation.environment.invalid" }).optional(),
  address: optionalText(120, "validation.address.max"),
  widthCm: z
    .number()
    .int("validation.centimeters.integer")
    .min(1, "validation.centimeters.min")
    .max(100_000)
    .optional(),
  heightCm: z
    .number()
    .int("validation.centimeters.integer")
    .min(1, "validation.centimeters.min")
    .max(100_000)
    .optional(),
  orientation: z.enum(ORIENTATIONS, { error: "validation.orientation.invalid" }).optional(),
  resolution: z
    .string()
    .trim()
    .regex(/^\d{2,5}x\d{2,5}$/, "validation.resolution.format")
    .optional(),
  availableDays: z
    .array(z.number().int().min(1).max(7))
    .max(7)
    .default([])
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  startTime: time.optional(),
  endTime: time.optional(),
  ratePerFiveSecondsDollars
});

function checkHours(
  value: { startTime?: string; endTime?: string },
  ctx: z.core.$RefinementCtx<unknown>
) {
  if ((value.startTime && !value.endTime) || (!value.startTime && value.endTime)) {
    ctx.addIssue({
      code: "custom",
      path: [value.startTime ? "endTime" : "startTime"],
      message: "validation.hours.both"
    });
  } else if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "validation.hours.order"
    });
  }
}

export const createScreenSchema = screenFieldsSchema.superRefine(checkHours);
export const updateScreenSchema = screenFieldsSchema
  .extend({ id: z.uuid({ error: "validation.screen.invalid" }) })
  .superRefine(checkHours);
export const screenIdSchema = z.object({ id: z.uuid({ error: "validation.screen.invalid" }) });
export const listScreensSchema = z.object({ archived: z.boolean().default(false) });
export const linkDeviceSchema = z.object({
  screenId: z.uuid({ error: "validation.screen.invalid" }),
  code: pairingCodeSchema
});
export const checkPairingCodeSchema = z.object({ code: pairingCodeSchema });

export type PlaceType = (typeof PLACE_TYPES)[number];
export type CreateScreenInput = z.infer<typeof createScreenSchema>;
export type UpdateScreenInput = z.infer<typeof updateScreenSchema>;
export type LinkDeviceInput = z.infer<typeof linkDeviceSchema>;

export type CodeAvailability =
  | { available: true; resolution: string | null }
  | { available: false; reason: "NOT_FOUND" | "OFFLINE" | "LINKED" };

/** A screen is incomplete until advertisers can see when it's available and what it costs. */
export function isScreenComplete(screen: {
  availableDays: number[];
  startTime?: string | null;
  endTime?: string | null;
  ratePerFiveSecondsCents?: number | null;
}): boolean {
  return (
    screen.availableDays.length > 0 &&
    !!screen.startTime &&
    !!screen.endTime &&
    screen.ratePerFiveSecondsCents !== null &&
    screen.ratePerFiveSecondsCents !== undefined
  );
}

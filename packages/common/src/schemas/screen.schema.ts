/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { isInDominicanRepublic } from "../utils/coordinates.js";
import {
  isResolutionInBounds,
  MIN_SCREEN_SHORT_SIDE_PX,
  normalizeResolution,
  parseResolution,
  RESOLUTION_PATTERN
} from "../utils/resolution.js";
import { pairingCodeSchema } from "./device.schema.js";
import { MAX_SCREEN_TAGS, SCREEN_TAGS } from "./screenTags.schema.js";

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
  description: optionalText(500, "validation.description.max"),
  latitude: z
    .number({ error: "validation.coordinates.format" })
    .min(-90, "validation.coordinates.format")
    .max(90, "validation.coordinates.format")
    .optional(),
  longitude: z
    .number({ error: "validation.coordinates.format" })
    .min(-180, "validation.coordinates.format")
    .max(180, "validation.coordinates.format")
    .optional(),
  tags: z
    .array(z.enum(SCREEN_TAGS, { error: "validation.tags.invalid" }))
    .max(MAX_SCREEN_TAGS, "validation.tags.max")
    .default([])
    .transform((tags) => [...new Set(tags)]),
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
  // Normalizing is idempotent, so re-validating inside the validated function is harmless.
  // `null` clears a saved resolution; omitting it leaves the stored value alone (see
  // createUpdateScreen). The two must stay distinguishable, or clearing silently does nothing.
  resolution: z
    .string()
    .transform(normalizeResolution)
    .pipe(z.string().regex(RESOLUTION_PATTERN, "validation.resolution.format"))
    .nullable()
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

function checkCoordinates(
  value: { latitude?: number; longitude?: number },
  ctx: z.core.$RefinementCtx<unknown>
) {
  const { latitude, longitude } = value;
  if (latitude === undefined && longitude === undefined) return;
  if (latitude === undefined || longitude === undefined) {
    ctx.addIssue({
      code: "custom",
      path: [latitude === undefined ? "latitude" : "longitude"],
      message: "validation.coordinates.both"
    });
  } else if (!isInDominicanRepublic(latitude, longitude)) {
    ctx.addIssue({
      code: "custom",
      path: ["latitude"],
      message: "validation.coordinates.outsideDr"
    });
  }
}

function checkResolution(
  value: { resolution?: string | null },
  ctx: z.core.$RefinementCtx<unknown>
) {
  if (!value.resolution || isResolutionInBounds(value.resolution)) return;
  const parsed = parseResolution(value.resolution);
  if (!parsed) return; // Shape is already flagged by the field-level format check.
  ctx.addIssue({
    code: "custom",
    path: ["resolution"],
    message:
      Math.min(parsed.width, parsed.height) < MIN_SCREEN_SHORT_SIDE_PX
        ? "validation.resolution.tooSmall"
        : "validation.resolution.tooLarge"
  });
}

type RefinableFields = Parameters<typeof checkHours>[0] &
  Parameters<typeof checkCoordinates>[0] &
  Parameters<typeof checkResolution>[0];
function checkScreen(value: RefinableFields, ctx: z.core.$RefinementCtx<unknown>) {
  checkHours(value, ctx);
  checkCoordinates(value, ctx);
  checkResolution(value, ctx);
}

export const createScreenSchema = screenFieldsSchema.superRefine(checkScreen);
export const updateScreenSchema = screenFieldsSchema
  .extend({ id: z.uuid({ error: "validation.screen.invalid" }) })
  .superRefine(checkScreen);
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

/**
 * A screen is incomplete until advertisers can see where it is, when it's available and what it
 * costs.
 */
export function isScreenComplete(screen: {
  availableDays: number[];
  startTime?: string | null;
  endTime?: string | null;
  ratePerFiveSecondsCents?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  return (
    screen.latitude !== null &&
    screen.latitude !== undefined &&
    screen.longitude !== null &&
    screen.longitude !== undefined &&
    screen.availableDays.length > 0 &&
    !!screen.startTime &&
    !!screen.endTime &&
    screen.ratePerFiveSecondsCents !== null &&
    screen.ratePerFiveSecondsCents !== undefined
  );
}

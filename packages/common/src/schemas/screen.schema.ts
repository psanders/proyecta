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

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  BILLBOARD: "Valla o pantalla exterior",
  MALL: "Centro comercial",
  RESTAURANT: "Restaurante o café",
  SUPERMARKET: "Supermercado o colmado",
  HEALTH: "Hospital o clínica",
  TRANSIT: "Terminal o transporte",
  GYM: "Gimnasio",
  OFFICE: "Oficina",
  EDUCATION: "Universidad o colegio",
  HOTEL: "Hotel",
  OTHER: "Otro"
};

export const ENVIRONMENT_LABELS = { INDOOR: "Interior", OUTDOOR: "Exterior" } as const;
export const ORIENTATION_LABELS = { LANDSCAPE: "Horizontal", PORTRAIT: "Vertical" } as const;

/** ISO weekday (1 = lunes … 7 = domingo) → short Spanish label. */
export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom"
};

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
export const SCREEN_STATUS_LABELS: Record<ScreenStatusView, string> = {
  ONLINE: "En línea",
  STALE: "Inestable",
  OFFLINE: "Sin conexión",
  UNLINKED: "Sin reproductor"
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM");
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} no puede tener más de ${max} caracteres`)
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
  .number({ error: "La tarifa es obligatoria" })
  .min(0, "La tarifa no puede ser negativa")
  .max(1_000_000, "La tarifa es demasiado alta")
  .refine((dollars) => {
    const cents = dollars * CENTS_PER_DOLLAR;
    return Math.abs(cents - Math.round(cents)) < 1e-6;
  }, "Usa como máximo dos decimales")
  .optional();

const screenFieldsSchema = z.object({
  name: z
    .string({ error: "El nombre de la pantalla es obligatorio" })
    .trim()
    .min(1, "El nombre de la pantalla es obligatorio")
    .max(80, "El nombre no puede tener más de 80 caracteres"),
  city: z
    .string({ error: "La ciudad es obligatoria" })
    .trim()
    .min(1, "La ciudad es obligatoria")
    .max(60, "La ciudad no puede tener más de 60 caracteres"),
  placeType: z.enum(PLACE_TYPES, { error: "Tipo de lugar no válido" }).optional(),
  environment: z.enum(["INDOOR", "OUTDOOR"], { error: "Elige interior o exterior" }).optional(),
  address: optionalText(120, "La dirección"),
  widthCm: z
    .number()
    .int("Usa centímetros enteros")
    .min(1, "Debe ser mayor que 0")
    .max(100_000)
    .optional(),
  heightCm: z
    .number()
    .int("Usa centímetros enteros")
    .min(1, "Debe ser mayor que 0")
    .max(100_000)
    .optional(),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"], { error: "Orientación no válida" }).optional(),
  resolution: z
    .string()
    .trim()
    .regex(/^\d{2,5}x\d{2,5}$/, "Usa el formato 1920x1080")
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
      message: "Indica la hora de inicio y la de fin"
    });
  } else if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "La hora de fin debe ser después de la de inicio"
    });
  }
}

export const createScreenSchema = screenFieldsSchema.superRefine(checkHours);
export const updateScreenSchema = screenFieldsSchema
  .extend({ id: z.uuid({ error: "Pantalla no válida" }) })
  .superRefine(checkHours);
export const screenIdSchema = z.object({ id: z.uuid({ error: "Pantalla no válida" }) });
export const listScreensSchema = z.object({ archived: z.boolean().default(false) });
export const linkDeviceSchema = z.object({
  screenId: z.uuid({ error: "Pantalla no válida" }),
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

export const CODE_UNAVAILABLE_MESSAGES = {
  NOT_FOUND: "No encontramos un reproductor con ese código",
  OFFLINE: "El reproductor no está conectado. Asegúrate de que esté encendido y con internet",
  LINKED: "Ese reproductor ya está vinculado a otra pantalla"
} as const;

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

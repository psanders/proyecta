/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import type { AssetKind } from "./asset.schema.js";
import { PLACE_TYPES, type Orientation } from "./screen.schema.js";

export const AD_STATES = ["SUBMITTED", "CANCELED"] as const;
export type AdState = (typeof AD_STATES)[number];

/** Every status a placement (ad × screen × file) can have; owner review adds the transitions. */
export const PLACEMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
  "WITHDRAWN"
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

/** What an advertiser sees for one screen of an ad. */
export const AD_SCREEN_STATUSES = [
  "PENDING_APPROVAL",
  "SCHEDULED",
  "ON_AIR",
  "FINISHED",
  "CANCELED",
  "NOT_APPROVED"
] as const;
export type AdScreenStatus = (typeof AD_SCREEN_STATUSES)[number];

/** What an advertiser sees for an ad as a whole. */
export const AD_STATUSES = [
  "CANCELED",
  "FINISHED",
  "ON_AIR",
  "SCHEDULED",
  "PENDING_APPROVAL",
  "NO_SCREENS"
] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const MAX_AD_SCREENS = 50;
export const MAX_AD_DAYS = 365;

const DAY_MS = 86_400_000;

/** Days from `from` to `to` for `YYYY-MM-DD` calendar dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

const dateSchema = z
  .string({ error: "validation.date.format" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date.format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  }, "validation.date.format");

const adNameSchema = z
  .string({ error: "validation.adName.required" })
  .trim()
  .min(1, "validation.adName.required")
  .max(80, "validation.adName.max");

const idOf = (message: string) => z.uuid({ error: message });

const screenIdsSchema = z
  .array(idOf("validation.screen.invalid"), { error: "validation.adScreens.min" })
  .min(1, "validation.adScreens.min")
  .max(MAX_AD_SCREENS, "validation.adScreens.max")
  .refine((ids) => new Set(ids).size === ids.length, "validation.adScreens.duplicate");

export const createAdSchema = z
  .object({
    name: adNameSchema,
    assetId: idOf("validation.asset.invalid"),
    startDate: dateSchema,
    endDate: dateSchema,
    screenIds: screenIdsSchema
  })
  .superRefine((value, ctx) => {
    const days = daysBetween(value.startDate, value.endDate);
    if (days < 0) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "validation.adDates.order" });
    } else if (days > MAX_AD_DAYS) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "validation.adDates.tooLong" });
    }
  });

export const adIdSchema = z.object({ id: idOf("validation.ad.invalid") });
export const addAdScreensSchema = adIdSchema.extend({ screenIds: screenIdsSchema });
export const removeAdScreenSchema = adIdSchema.extend({
  screenId: idOf("validation.screen.invalid")
});
export const replaceAdAssetSchema = adIdSchema.extend({
  assetId: idOf("validation.asset.invalid")
});
export const listCatalogScreensSchema = z.object({
  city: z.string().trim().max(60).optional(),
  placeType: z.enum(PLACE_TYPES, { error: "validation.placeType.invalid" }).optional()
});

export type CreateAdInput = z.infer<typeof createAdSchema>;

/** The facts about one placement row that statuses are derived from. */
export interface PlacementFacts {
  id: string;
  status: PlacementStatus;
  assetId: string;
  createdAt: Date;
}

/**
 * The placement that plays for one ad and screen: the most recently created approved row among rows
 * that aren't withdrawn. An approved file keeps playing until a newer file is approved.
 */
export function effectivePlacement<T extends PlacementFacts>(rows: readonly T[]): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.status !== "APPROVED") continue;
    if (!best || row.createdAt > best.createdAt) best = row;
  }
  return best;
}

export interface AdTiming {
  state: AdState;
  startsAt: Date;
  endsAt: Date;
}

/**
 * One screen's status within an ad, from its placement rows. Returns null when every row was
 * withdrawn (the screen was removed from the ad). `newFilePending` is true when an approved file
 * plays while a newer file waits for approval.
 */
export function adScreenStatus(
  ad: AdTiming,
  rows: readonly PlacementFacts[],
  now: Date
): { status: AdScreenStatus; newFilePending: boolean } | null {
  const active = rows.filter((row) => row.status !== "WITHDRAWN");
  if (active.length === 0) return null;
  if (ad.state === "CANCELED") return { status: "CANCELED", newFilePending: false };
  if (now >= ad.endsAt) return { status: "FINISHED", newFilePending: false };
  const effective = effectivePlacement(active);
  if (effective) {
    return {
      status: now < ad.startsAt ? "SCHEDULED" : "ON_AIR",
      newFilePending: active.some(
        (row) => row.status === "PENDING" && row.createdAt > effective.createdAt
      )
    };
  }
  if (active.some((row) => row.status === "PENDING")) {
    return { status: "PENDING_APPROVAL", newFilePending: false };
  }
  return { status: "NOT_APPROVED", newFilePending: false };
}

/** An ad's single status: the first of cancelled, finished, on air, scheduled, pending, no screens. */
export function adStatus(ad: AdTiming, screens: readonly AdScreenStatus[], now: Date): AdStatus {
  if (ad.state === "CANCELED") return "CANCELED";
  if (now >= ad.endsAt) return "FINISHED";
  if (screens.includes("ON_AIR")) return "ON_AIR";
  if (screens.includes("SCHEDULED")) return "SCHEDULED";
  if (screens.includes("PENDING_APPROVAL")) return "PENDING_APPROVAL";
  return "NO_SCREENS";
}

/** A screen as advertisers see it in the catalog. */
export interface CatalogScreenView {
  id: string;
  name: string;
  city: string;
  address: string | null;
  placeType: string | null;
  orientation: Orientation | null;
  resolution: string | null;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  ratePerFiveSecondsCents: number;
  /** Owned by the viewer's business: plays there are house plays. */
  own: boolean;
}

export interface AdAssetSummary {
  id: string;
  name: string;
  kind: AssetKind;
  durationMs: number;
  orientation: Orientation;
  poster: string | null;
}

export interface AdPlayStats {
  /** Completed plays, house plays included. */
  plays: number;
  /** Completed plays on the advertiser's own screens (not billable). */
  housePlays: number;
  /** Spend in US$ cents from billable plays. */
  spendCents: number;
}

export interface AdListItem {
  id: string;
  name: string;
  status: AdStatus;
  startDate: string;
  endDate: string;
  asset: AdAssetSummary;
  screens: { total: number; approved: number };
  createdAt: string;
}

export interface AdScreenView extends AdPlayStats {
  screenId: string;
  name: string;
  city: string;
  placeType: string | null;
  own: boolean;
  status: AdScreenStatus;
  newFilePending: boolean;
  ratePerFiveSecondsCents: number | null;
}

export interface AdDetail extends AdListItem {
  advertiserName: string;
  stats: AdPlayStats;
  adScreens: AdScreenView[];
}

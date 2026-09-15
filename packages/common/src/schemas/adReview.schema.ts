/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  REVIEW_REASONS,
  type AdAssetSummary,
  type AdScreenStatus,
  type ReviewReason
} from "./ad.schema.js";
import type { AssetRenditions } from "./asset.schema.js";

export const MAX_REVIEW_NOTE = 280;

const adId = z.uuid({ error: "validation.ad.invalid" });
const screenId = z.uuid({ error: "validation.screen.invalid" });
const note = z
  .string()
  .trim()
  .max(MAX_REVIEW_NOTE, "validation.review.noteMax")
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const REQUEST_TABS = ["PENDING", "REVIEWED"] as const;
export type RequestTab = (typeof REQUEST_TABS)[number];

export const listRequestsSchema = z.object({
  tab: z.enum(REQUEST_TABS).default("PENDING")
});

export const requestIdSchema = z.object({ adId });

export const approveRequestSchema = z.object({
  adId,
  screenIds: z
    .array(screenId, { error: "validation.review.screens" })
    .min(1, "validation.review.screens")
    .max(50)
});

export const rejectRequestSchema = z
  .object({
    adId,
    reason: z.enum(REVIEW_REASONS, { error: "validation.review.reason" }),
    note
  })
  .superRefine((value, ctx) => {
    if (value.reason === "OTHER" && !value.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "validation.review.noteRequired" });
    }
  });

export const revokePlacementSchema = z.object({ adId, screenId, note });

export const screenAdsSchema = z.object({ screenId });

export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;

/** One of the owner's screens within a request. */
export interface RequestScreenView {
  screenId: string;
  name: string;
  city: string;
  placeType: string | null;
  ratePerFiveSecondsCents: number | null;
  status: AdScreenStatus;
  /** The current file waits for this owner's decision on this screen. */
  pending: boolean;
  reasonCode: ReviewReason | null;
  note: string | null;
}

/** Another business's ad on the owner's screens, as the owner sees it. */
export interface ReviewRequestView {
  adId: string;
  adName: string;
  advertiserName: string;
  asset: AdAssetSummary & { renditions: AssetRenditions; width: number; height: number };
  startDate: string;
  endDate: string;
  /** Some screen of the owner waits for a decision on the ad's current file. */
  pending: boolean;
  /** The ad can still be decided on: not cancelled and not ended. */
  open: boolean;
  screens: RequestScreenView[];
  createdAt: string;
}

/** Another business's ad on one of the owner's screens (screen detail). */
export interface ScreenAdView {
  adId: string;
  adName: string;
  advertiserName: string;
  startDate: string;
  endDate: string;
  status: AdScreenStatus;
}

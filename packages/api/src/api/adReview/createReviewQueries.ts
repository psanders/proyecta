/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  adScreenStatus,
  listRequestsSchema,
  requestIdSchema,
  screenAdsSchema,
  withErrorHandlingAndValidation,
  type AssetRenditions,
  type ReviewRequestView,
  type ScreenAdView
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { DomainError } from "../../identity/errors.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };

export interface ReviewDeps {
  db: DbClient;
  now?: () => Date;
}

const withAdAndScreen = {
  ad: { include: { asset: true } },
  screen: {
    select: { id: true, name: true, city: true, placeType: true, ratePerFiveSecondsCents: true }
  }
} satisfies Prisma.AdPlacementInclude;

type PlacementRow = Prisma.AdPlacementGetPayload<{ include: typeof withAdAndScreen }>;

/** Placements of other businesses' ads on the owner's screens. */
export function ownerPlacementsWhere(
  workspaceAccessKeyId: string,
  extra: Prisma.AdPlacementWhereInput = {}
): Prisma.AdPlacementWhereInput {
  return {
    screen: { workspaceAccessKeyId },
    ad: { workspaceAccessKeyId: { not: workspaceAccessKeyId } },
    ...extra
  };
}

/** Groups an owner's placement rows into requests (one per ad) with per-screen statuses. */
export function toRequests(rows: PlacementRow[], at: Date): ReviewRequestView[] {
  const byAd = new Map<string, PlacementRow[]>();
  for (const row of rows) byAd.set(row.adId, [...(byAd.get(row.adId) ?? []), row]);

  const requests: ReviewRequestView[] = [];
  for (const adRows of byAd.values()) {
    const { ad } = adRows[0]!;
    const open = ad.state === "SUBMITTED" && at < ad.endsAt;
    const byScreen = new Map<string, PlacementRow[]>();
    for (const row of adRows)
      byScreen.set(row.screenId, [...(byScreen.get(row.screenId) ?? []), row]);

    const screens: ReviewRequestView["screens"] = [];
    for (const screenRows of byScreen.values()) {
      const status = adScreenStatus(ad, screenRows, at);
      if (!status) continue;
      const { screen } = screenRows[0]!;
      screens.push({
        screenId: screen.id,
        name: screen.name,
        city: screen.city,
        placeType: screen.placeType,
        ratePerFiveSecondsCents: screen.ratePerFiveSecondsCents,
        status: status.status,
        pending: open && screenRows.some((r) => r.status === "PENDING" && r.assetId === ad.assetId),
        reasonCode: status.reasonCode,
        note: status.note
      });
    }
    if (screens.length === 0) continue;
    screens.sort((a, b) => a.name.localeCompare(b.name));
    const renditions = (ad.asset.renditions ?? {}) as AssetRenditions;
    requests.push({
      adId: ad.id,
      adName: ad.name,
      advertiserName: ad.advertiserName,
      asset: {
        id: ad.asset.id,
        name: ad.asset.name,
        kind: ad.asset.kind,
        durationMs: ad.asset.durationMs,
        orientation: ad.asset.orientation,
        poster: renditions.poster ?? null,
        renditions,
        width: ad.asset.width,
        height: ad.asset.height
      },
      startDate: ad.startDate,
      endDate: ad.endDate,
      pending: screens.some((s) => s.pending),
      open,
      screens,
      createdAt: ad.createdAt.toISOString()
    });
  }
  return requests;
}

/**
 * Creates a function that lists the owner's requests: Pendientes (some screen waits for a decision
 * on the ad's current file), soonest start first; Revisadas (everything else), newest first.
 *
 * @param deps - Injected database client and clock
 */
export function createListRequests(deps: ReviewDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = listRequestsSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<ReviewRequestView[]> => {
    const at = now();
    const rows = await deps.db.adPlacement.findMany({
      where: ownerPlacementsWhere(params.workspaceAccessKeyId),
      include: withAdAndScreen
    });
    const requests = toRequests(rows, at).filter((r) => r.pending === (params.tab === "PENDING"));
    return params.tab === "PENDING"
      ? requests.sort((a, b) => a.startDate.localeCompare(b.startDate))
      : requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that returns one request of the owner (another business's ad on its screens).
 *
 * @param deps - Injected database client and clock
 */
export function createGetRequest(deps: ReviewDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = requestIdSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<ReviewRequestView> => {
    const rows = await deps.db.adPlacement.findMany({
      where: ownerPlacementsWhere(params.workspaceAccessKeyId, { adId: params.adId }),
      include: withAdAndScreen
    });
    const [request] = toRequests(rows, now());
    if (!request) throw new DomainError("NOT_FOUND", "errors.review.notFound");
    return request;
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that counts the owner's pending requests: distinct ads of other businesses,
 * not cancelled and not ended, with a pending placement on the owner's screens. Pending rows of
 * replaced files are withdrawn, so every pending row belongs to the ad's current file.
 *
 * @param deps - Injected database client and clock
 */
export function createGetPendingRequestCount(deps: ReviewDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = z.object(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<{ count: number }> => {
    const rows = await deps.db.adPlacement.findMany({
      where: {
        screen: { workspaceAccessKeyId: params.workspaceAccessKeyId },
        status: "PENDING",
        ad: {
          workspaceAccessKeyId: { not: params.workspaceAccessKeyId },
          state: "SUBMITTED",
          endsAt: { gt: now() }
        }
      },
      distinct: ["adId"],
      select: { adId: true }
    });
    return { count: rows.length };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that lists other businesses' ads on one of the owner's screens that are
 * pending, scheduled or on air (screen detail).
 *
 * @param deps - Injected database client and clock
 */
export function createListScreenAds(deps: ReviewDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = screenAdsSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<ScreenAdView[]> => {
    const screen = await deps.db.screen.findFirst({
      where: { id: params.screenId, workspaceAccessKeyId: params.workspaceAccessKeyId },
      select: { id: true }
    });
    if (!screen) throw new DomainError("NOT_FOUND", "errors.screen.notFound");
    const rows = await deps.db.adPlacement.findMany({
      where: ownerPlacementsWhere(params.workspaceAccessKeyId, { screenId: params.screenId }),
      include: withAdAndScreen
    });
    return toRequests(rows, now())
      .map((request) => ({ request, status: request.screens[0]!.status }))
      .filter(({ status }) => ["PENDING_APPROVAL", "SCHEDULED", "ON_AIR"].includes(status))
      .map(({ request, status }) => ({
        adId: request.adId,
        adName: request.adName,
        advertiserName: request.advertiserName,
        startDate: request.startDate,
        endDate: request.endDate,
        status
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  };
  return withErrorHandlingAndValidation(fn, schema);
}

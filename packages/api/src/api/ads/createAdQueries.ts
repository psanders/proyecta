/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  adIdSchema,
  adScreenStatus,
  adStatus,
  centsForPlay,
  listCatalogScreensSchema,
  withErrorHandlingAndValidation,
  type AdAssetSummary,
  type AdDetail,
  type AdListItem,
  type AdPlayStats,
  type AdScreenStatusView,
  type AdScreenView,
  type AssetRenditions,
  type CatalogScreenView
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { DomainError } from "../../identity/errors.js";
import { catalogScreenWhere } from "./createAdFunctions.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };

export interface AdQueryDeps {
  db: DbClient;
  now?: () => Date;
}

const adWithPlacements = {
  asset: true,
  placements: {
    select: {
      id: true,
      screenId: true,
      assetId: true,
      status: true,
      createdAt: true,
      reasonCode: true,
      note: true
    }
  }
} satisfies Prisma.AdInclude;

type AdRow = Prisma.AdGetPayload<{ include: typeof adWithPlacements }>;
type PlacementRow = AdRow["placements"][number];

function assetSummary(asset: AdRow["asset"]): AdAssetSummary {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    durationMs: asset.durationMs,
    orientation: asset.orientation,
    poster: ((asset.renditions ?? {}) as AssetRenditions).poster ?? null
  };
}

function byScreen(placements: PlacementRow[]): Map<string, PlacementRow[]> {
  const map = new Map<string, PlacementRow[]>();
  for (const p of placements) map.set(p.screenId, [...(map.get(p.screenId) ?? []), p]);
  return map;
}

/** Per-screen statuses (removed screens left out) and the ad's list item. */
function summarize(ad: AdRow, at: Date) {
  const screens = new Map<string, AdScreenStatusView>();
  for (const [screenId, rows] of byScreen(ad.placements)) {
    const status = adScreenStatus(ad, rows, at);
    if (status) screens.set(screenId, status);
  }
  const statuses = [...screens.values()].map((s) => s.status);
  const item: AdListItem = {
    id: ad.id,
    name: ad.name,
    status: adStatus(ad, statuses, at),
    startDate: ad.startDate,
    endDate: ad.endDate,
    asset: assetSummary(ad.asset),
    screens: {
      total: screens.size,
      approved: statuses.filter((s) => s === "ON_AIR" || s === "SCHEDULED").length
    },
    createdAt: ad.createdAt.toISOString()
  };
  return { item, screens };
}

/**
 * Creates a function that lists the catalog of screens advertisers can use: active, complete screens
 * of every business, filterable by city and place type, marking the viewer's own screens.
 *
 * @param deps - Injected database client
 */
export function createListCatalogScreens(deps: Pick<AdQueryDeps, "db">) {
  const schema = listCatalogScreensSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<CatalogScreenView[]> => {
    const rows = await deps.db.screen.findMany({
      where: {
        ...catalogScreenWhere,
        ...(params.city ? { city: { equals: params.city, mode: "insensitive" } } : {}),
        ...(params.placeType ? { placeType: params.placeType } : {})
      },
      orderBy: [{ city: "asc" }, { name: "asc" }]
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      address: row.address,
      placeType: row.placeType,
      orientation: row.orientation,
      resolution: row.resolution,
      availableDays: row.availableDays,
      startTime: row.startTime,
      endTime: row.endTime,
      ratePerFiveSecondsCents: row.ratePerFiveSecondsCents!,
      own: row.workspaceAccessKeyId === params.workspaceAccessKeyId
    }));
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that lists a business's ads, newest first, with derived statuses.
 *
 * @param deps - Injected database client and clock
 */
export function createListAds(deps: AdQueryDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = z.object(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<AdListItem[]> => {
    const at = now();
    const rows = await deps.db.ad.findMany({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId },
      include: adWithPlacements,
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => summarize(row, at).item);
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that returns one ad of the business with each screen's status, plays and
 * spend. House plays (on the business's own screens) are counted apart and never add to spend.
 *
 * @param deps - Injected database client and clock
 */
export function createGetAd(deps: AdQueryDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = adIdSchema.extend(scoped);
  const fn = async (params: z.infer<typeof schema>): Promise<AdDetail> => {
    const at = now();
    const ad = await deps.db.ad.findFirst({
      where: { id: params.id, workspaceAccessKeyId: params.workspaceAccessKeyId },
      include: adWithPlacements
    });
    if (!ad) throw new DomainError("NOT_FOUND", "errors.ad.notFound");
    const { item, screens } = summarize(ad, at);

    const [screenRows, plays] = await Promise.all([
      deps.db.screen.findMany({ where: { id: { in: [...screens.keys()] } } }),
      deps.db.playLog.findMany({
        where: { placementId: { in: ad.placements.map((p) => p.id) }, result: "COMPLETED" },
        select: { placementId: true, billedUnits: true, rateCentsAtPlay: true, house: true }
      })
    ]);

    const screenOf = new Map(ad.placements.map((p) => [p.id, p.screenId]));
    const empty = (): AdPlayStats => ({ plays: 0, housePlays: 0, spendCents: 0 });
    const perScreen = new Map<string, AdPlayStats>();
    const total = empty();
    for (const play of plays) {
      const screenId = screenOf.get(play.placementId!)!;
      const stats = perScreen.get(screenId) ?? empty();
      for (const acc of [stats, total]) {
        acc.plays += 1;
        if (play.house) acc.housePlays += 1;
        else acc.spendCents += centsForPlay(play.billedUnits, play.rateCentsAtPlay);
      }
      perScreen.set(screenId, stats);
    }

    const adScreens: AdScreenView[] = screenRows
      .map((screen) => ({
        screenId: screen.id,
        name: screen.name,
        city: screen.city,
        placeType: screen.placeType,
        own: screen.workspaceAccessKeyId === ad.workspaceAccessKeyId,
        ratePerFiveSecondsCents: screen.ratePerFiveSecondsCents,
        ...screens.get(screen.id)!,
        ...(perScreen.get(screen.id) ?? empty())
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { ...item, advertiserName: ad.advertiserName, stats: total, adScreens };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

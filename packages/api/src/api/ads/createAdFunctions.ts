/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  addAdScreensSchema,
  adIdSchema,
  createAdSchema,
  localDateString,
  removeAdScreenSchema,
  replaceAdAssetSchema,
  startOfLocalDate,
  withErrorHandlingAndValidation,
  type PlacementStatus
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";
import { workspaceTimeZone } from "../workspaces/createWorkspaceSettingsFunctions.js";

const scoped = { workspaceAccessKeyId: z.string().min(1) };

export interface AdDeps {
  db: DbClient;
  /** Pushes updated rotations to the players of these screens. */
  notifyScreens: (screenIds: string[]) => Promise<void>;
  now?: () => Date;
}

/** Screens advertisers can use: active, not deleted and complete (days, hours and a rate). */
export const catalogScreenWhere = {
  status: "ACTIVE",
  deletedAt: null,
  ratePerFiveSecondsCents: { not: null },
  startTime: { not: null },
  endTime: { not: null },
  availableDays: { isEmpty: false }
} satisfies Prisma.ScreenWhereInput;

/** A screen with no orientation set accepts either orientation. */
export function orientationFits(screen: string | null, asset: string): boolean {
  return screen === null || screen === asset;
}

/** Own screens start approved; other businesses' screens wait for their owner. */
function initialPlacement(
  advertiser: string,
  screenWorkspace: string,
  at: Date
): { status: PlacementStatus; decidedAt: Date | null } {
  return advertiser === screenWorkspace
    ? { status: "APPROVED", decidedAt: at }
    : { status: "PENDING", decidedAt: null };
}

async function findReadyAsset(db: DbClient, workspaceAccessKeyId: string, assetId: string) {
  const asset = await db.asset.findFirst({ where: { id: assetId, workspaceAccessKeyId } });
  if (!asset) throw new DomainError("NOT_FOUND", "errors.asset.notFound");
  if (asset.status !== "READY")
    throw new DomainError("PRECONDITION_FAILED", "errors.asset.notReady");
  return asset;
}

async function findCatalogScreens(db: DbClient, screenIds: string[], orientation: string) {
  const screens = await db.screen.findMany({
    where: { id: { in: screenIds }, ...catalogScreenWhere },
    select: { id: true, workspaceAccessKeyId: true, orientation: true }
  });
  if (screens.length !== screenIds.length) {
    throw new DomainError("PRECONDITION_FAILED", "errors.ad.screenUnavailable");
  }
  if (screens.some((s) => !orientationFits(s.orientation, orientation))) {
    throw new DomainError("BAD_REQUEST", "errors.ad.orientationMismatch");
  }
  return screens;
}

/** Loads an ad of the business that can still change: not cancelled and not finished. */
async function findEditableAd(db: DbClient, workspaceAccessKeyId: string, id: string, at: Date) {
  const ad = await db.ad.findFirst({
    where: { id, workspaceAccessKeyId },
    include: { asset: true, placements: true }
  });
  if (!ad) throw new DomainError("NOT_FOUND", "errors.ad.notFound");
  if (ad.state === "CANCELED") throw new DomainError("PRECONDITION_FAILED", "errors.ad.canceled");
  if (at >= ad.endsAt) throw new DomainError("PRECONDITION_FAILED", "errors.ad.finished");
  return ad;
}

/** Screen ids that still have a non-withdrawn placement in the ad. */
function activeScreenIds(placements: { screenId: string; status: PlacementStatus }[]): string[] {
  return [...new Set(placements.filter((p) => p.status !== "WITHDRAWN").map((p) => p.screenId))];
}

/**
 * Creates a function that creates an ad from a ready asset of the business for a set of catalog
 * screens and calendar dates (in the business's time zone). Placements on the business's own
 * screens start approved; on other businesses' screens they wait for approval and never play.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createCreateAd(deps: AdDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = createAdSchema.and(
    z.object({ ...scoped, advertiserName: z.string().trim().min(1) })
  );

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const at = now();
    const asset = await findReadyAsset(deps.db, params.workspaceAccessKeyId, params.assetId);
    const timeZone = await workspaceTimeZone(deps.db, params.workspaceAccessKeyId);
    if (params.startDate < localDateString(at, timeZone)) {
      throw new DomainError("BAD_REQUEST", "errors.ad.startInPast");
    }
    const screens = await findCatalogScreens(deps.db, params.screenIds, asset.orientation);

    const ad = await deps.db.ad.create({
      data: {
        workspaceAccessKeyId: params.workspaceAccessKeyId,
        name: params.name,
        advertiserName: params.advertiserName,
        assetId: asset.id,
        startDate: params.startDate,
        endDate: params.endDate,
        startsAt: startOfLocalDate(params.startDate, timeZone),
        endsAt: startOfLocalDate(params.endDate, timeZone, 1),
        placements: {
          create: screens.map((screen) => ({
            screenId: screen.id,
            assetId: asset.id,
            ...initialPlacement(params.workspaceAccessKeyId, screen.workspaceAccessKeyId, at)
          }))
        }
      }
    });
    logger.verbose("ad created", { id: ad.id, screens: screens.length });
    await deps.notifyScreens(screens.map((s) => s.id));
    return { id: ad.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that adds catalog screens to an ad that isn't cancelled or finished, with the
 * same initial status rule as creation.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createAddAdScreens(deps: AdDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = addAdScreensSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const at = now();
    const ad = await findEditableAd(deps.db, params.workspaceAccessKeyId, params.id, at);
    const current = new Set(activeScreenIds(ad.placements));
    if (params.screenIds.some((id) => current.has(id))) {
      throw new DomainError("CONFLICT", "errors.ad.screenAlreadyInAd");
    }
    const screens = await findCatalogScreens(deps.db, params.screenIds, ad.asset.orientation);
    await deps.db.adPlacement.createMany({
      data: screens.map((screen) => ({
        adId: ad.id,
        screenId: screen.id,
        assetId: ad.assetId,
        ...initialPlacement(ad.workspaceAccessKeyId, screen.workspaceAccessKeyId, at)
      }))
    });
    logger.verbose("ad screens added", { id: ad.id, screens: screens.length });
    await deps.notifyScreens(screens.map((s) => s.id));
    return { id: ad.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that removes a screen from an ad: its placements are withdrawn, so the ad
 * stops playing there; past plays stay attributed.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createRemoveAdScreen(deps: AdDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = removeAdScreenSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const at = now();
    const ad = await findEditableAd(deps.db, params.workspaceAccessKeyId, params.id, at);
    if (!activeScreenIds(ad.placements).includes(params.screenId)) {
      throw new DomainError("NOT_FOUND", "errors.ad.screenNotInAd");
    }
    await deps.db.adPlacement.updateMany({
      where: { adId: ad.id, screenId: params.screenId, status: { not: "WITHDRAWN" } },
      data: { status: "WITHDRAWN", withdrawnAt: at }
    });
    logger.verbose("ad screen removed", { id: ad.id, screenId: params.screenId });
    await deps.notifyScreens([params.screenId]);
    return { id: ad.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that replaces an ad's file with another ready asset of the same orientation.
 * Every screen in the ad gets a placement for the new file; an approved previous file keeps playing
 * until the new one is approved there (own screens switch at once). Pending placements of older
 * files are withdrawn, since nobody should review a file the ad no longer uses.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createReplaceAdAsset(deps: AdDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = replaceAdAssetSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const at = now();
    const ad = await findEditableAd(deps.db, params.workspaceAccessKeyId, params.id, at);
    if (params.assetId === ad.assetId) {
      throw new DomainError("BAD_REQUEST", "errors.asset.sameFile");
    }
    const asset = await findReadyAsset(deps.db, params.workspaceAccessKeyId, params.assetId);
    if (asset.orientation !== ad.asset.orientation) {
      throw new DomainError("BAD_REQUEST", "errors.asset.orientationMismatch");
    }
    const screenIds = activeScreenIds(ad.placements);
    const screens = await deps.db.screen.findMany({
      where: { id: { in: screenIds } },
      select: { id: true, workspaceAccessKeyId: true }
    });

    await deps.db.$transaction([
      deps.db.adPlacement.updateMany({
        where: { adId: ad.id, status: "PENDING" },
        data: { status: "WITHDRAWN", withdrawnAt: at }
      }),
      deps.db.adPlacement.createMany({
        data: screens.map((screen) => ({
          adId: ad.id,
          screenId: screen.id,
          assetId: asset.id,
          ...initialPlacement(ad.workspaceAccessKeyId, screen.workspaceAccessKeyId, at)
        }))
      }),
      deps.db.ad.update({ where: { id: ad.id }, data: { assetId: asset.id } })
    ]);
    logger.verbose("ad file replaced", { id: ad.id, assetId: asset.id });
    await deps.notifyScreens(screenIds);
    return { id: ad.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that cancels an ad that hasn't finished: it stops on every screen at once and
 * can't be changed again. Its placements and plays are kept.
 *
 * @param deps - Injected database client, screen notifier and clock
 */
export function createCancelAd(deps: AdDeps) {
  const now = deps.now ?? (() => new Date());
  const schema = adIdSchema.extend(scoped);

  const fn = async (params: z.infer<typeof schema>): Promise<{ id: string }> => {
    const at = now();
    const ad = await findEditableAd(deps.db, params.workspaceAccessKeyId, params.id, at);
    await deps.db.ad.update({
      where: { id: ad.id },
      data: { state: "CANCELED", canceledAt: at }
    });
    logger.verbose("ad cancelled", { id: ad.id });
    await deps.notifyScreens(activeScreenIds(ad.placements));
    return { id: ad.id };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

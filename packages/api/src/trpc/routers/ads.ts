/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  addAdScreensSchema,
  adIdSchema,
  createAdSchema,
  listCatalogScreensSchema,
  removeAdScreenSchema,
  replaceAdAssetSchema
} from "@proyecta/common";
import {
  createAddAdScreens,
  createCancelAd,
  createCreateAd,
  createRemoveAdScreen,
  createReplaceAdAsset,
  type AdDeps
} from "../../api/ads/createAdFunctions.js";
import {
  createGetAd,
  createListAds,
  createListCatalogScreens
} from "../../api/ads/createAdQueries.js";
import { DomainError, toTRPCError } from "../../identity/errors.js";
import type { Context } from "../context.js";
import { adminProcedure, router, workspaceProcedure } from "../trpc.js";
import { validate } from "../validate.js";

const adDeps = (ctx: Context): AdDeps => ({
  db: ctx.sync.db,
  notifyScreens: ctx.notifyScreens,
  now: ctx.sync.now
});

/** Ads of the active business and the screen catalog they choose from. */
export const adsRouter = router({
  catalog: workspaceProcedure.input(validate(listCatalogScreensSchema)).query(({ ctx, input }) =>
    createListCatalogScreens(ctx.sync)({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  ),

  list: workspaceProcedure.query(({ ctx }) =>
    createListAds(ctx.sync)({ workspaceAccessKeyId: ctx.workspace.accessKeyId })
  ),

  get: workspaceProcedure
    .input(validate(adIdSchema))
    .query(({ ctx, input }) =>
      createGetAd(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  create: adminProcedure.input(validate(createAdSchema)).mutation(async ({ ctx, input }) => {
    // The advertiser name shown on players is the business name when the ad is created.
    const { items } = await ctx.identity.listWorkspaces(ctx.token);
    const business = items.find((w) => w.accessKeyId === ctx.workspace.accessKeyId);
    if (!business) throw toTRPCError(new DomainError("NOT_FOUND", "errors.workspace.notFound"));
    return createCreateAd(adDeps(ctx))({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      advertiserName: business.name
    });
  }),

  addScreens: adminProcedure
    .input(validate(addAdScreensSchema))
    .mutation(({ ctx, input }) =>
      createAddAdScreens(adDeps(ctx))({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  removeScreen: adminProcedure.input(validate(removeAdScreenSchema)).mutation(({ ctx, input }) =>
    createRemoveAdScreen(adDeps(ctx))({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  ),

  replaceAsset: adminProcedure.input(validate(replaceAdAssetSchema)).mutation(({ ctx, input }) =>
    createReplaceAdAsset(adDeps(ctx))({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  ),

  cancel: adminProcedure
    .input(validate(adIdSchema))
    .mutation(({ ctx, input }) =>
      createCancelAd(adDeps(ctx))({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    )
});

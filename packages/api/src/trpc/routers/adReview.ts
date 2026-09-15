/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  approveRequestSchema,
  listRequestsSchema,
  rejectRequestSchema,
  requestIdSchema,
  revokePlacementSchema,
  screenAdsSchema
} from "@proyecta/common";
import {
  createApproveRequest,
  createRejectRequest,
  createRevokePlacement
} from "../../api/adReview/createReviewFunctions.js";
import {
  createGetPendingRequestCount,
  createGetRequest,
  createListRequests,
  createListScreenAds
} from "../../api/adReview/createReviewQueries.js";
import { adminProcedure, router, workspaceProcedure } from "../trpc.js";
import { validate } from "../validate.js";

/** Owners deciding on other businesses' ads on their screens. */
export const adReviewRouter = router({
  list: workspaceProcedure
    .input(validate(listRequestsSchema))
    .query(({ ctx, input }) =>
      createListRequests(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  get: workspaceProcedure
    .input(validate(requestIdSchema))
    .query(({ ctx, input }) =>
      createGetRequest(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  pendingCount: workspaceProcedure.query(({ ctx }) =>
    createGetPendingRequestCount(ctx.sync)({ workspaceAccessKeyId: ctx.workspace.accessKeyId })
  ),

  screenAds: workspaceProcedure
    .input(validate(screenAdsSchema))
    .query(({ ctx, input }) =>
      createListScreenAds(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  approve: adminProcedure.input(validate(approveRequestSchema)).mutation(({ ctx, input }) =>
    createApproveRequest({ db: ctx.sync.db, notifyScreens: ctx.notifyScreens, now: ctx.sync.now })({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      userRef: ctx.principal.userRef
    })
  ),

  reject: adminProcedure.input(validate(rejectRequestSchema)).mutation(({ ctx, input }) =>
    createRejectRequest({ db: ctx.sync.db, now: ctx.sync.now })({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      userRef: ctx.principal.userRef
    })
  ),

  revoke: adminProcedure.input(validate(revokePlacementSchema)).mutation(({ ctx, input }) =>
    createRevokePlacement({
      db: ctx.sync.db,
      notifyScreens: ctx.notifyScreens,
      now: ctx.sync.now
    })({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      userRef: ctx.principal.userRef
    })
  )
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCError } from "@trpc/server";
import {
  checkPairingCodeSchema,
  createScreenSchema,
  linkDeviceSchema,
  listScreensSchema,
  screenIdSchema,
  updateScreenSchema
} from "@proyecta/common";
import {
  createCheckPairingCode,
  createLinkDevice,
  createUnlinkDevice
} from "../../api/pairing/createPairingFunctions.js";
import { createGetScreenEarnings } from "../../api/screens/createGetScreenEarnings.js";
import {
  createCreateScreen,
  createGetScreen,
  createListScreens,
  createRetireScreen,
  createUpdateScreen
} from "../../api/screens/createScreenFunctions.js";
import type { ScreenStatusEvent } from "../../events/hub.js";
import { adminProcedure, router, workspaceProcedure } from "../trpc.js";
import { validate } from "../validate.js";

function limit(take: (key: string) => boolean, workspace: string) {
  if (!take(workspace)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados intentos. Espera un minuto."
    });
  }
}

export const screensRouter = router({
  list: workspaceProcedure
    .input(validate(listScreensSchema))
    .query(({ ctx, input }) =>
      createListScreens(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  get: workspaceProcedure
    .input(validate(screenIdSchema))
    .query(({ ctx, input }) =>
      createGetScreen(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  earnings: workspaceProcedure.input(validate(screenIdSchema)).query(({ ctx, input }) =>
    createGetScreenEarnings(ctx.sync)({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  ),

  create: adminProcedure
    .input(validate(createScreenSchema))
    .mutation(({ ctx, input }) =>
      createCreateScreen(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  update: adminProcedure
    .input(validate(updateScreenSchema))
    .mutation(({ ctx, input }) =>
      createUpdateScreen(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  archive: adminProcedure
    .input(validate(screenIdSchema))
    .mutation(({ ctx, input }) =>
      createRetireScreen(
        ctx.sync,
        "archive"
      )({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  delete: adminProcedure
    .input(validate(screenIdSchema))
    .mutation(({ ctx, input }) =>
      createRetireScreen(
        ctx.sync,
        "delete"
      )({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  checkCode: adminProcedure.input(validate(checkPairingCodeSchema)).query(({ ctx, input }) => {
    limit(ctx.pairingLimiter.take, ctx.workspace.accessKeyId);
    return createCheckPairingCode(ctx.sync)({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    });
  }),

  link: adminProcedure.input(validate(linkDeviceSchema)).mutation(({ ctx, input }) => {
    limit(ctx.pairingLimiter.take, ctx.workspace.accessKeyId);
    return createLinkDevice(ctx.sync)({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    });
  }),

  unlink: adminProcedure
    .input(validate(screenIdSchema))
    .mutation(({ ctx, input }) =>
      createUnlinkDevice(ctx.sync)({ ...input, workspaceAccessKeyId: ctx.workspace.accessKeyId })
    ),

  /** Live status changes for the active workspace's screens. */
  onStatus: workspaceProcedure.subscription(async function* ({ ctx, signal }) {
    const queue: ScreenStatusEvent[] = [];
    let wake: (() => void) | undefined;
    const unsubscribe = ctx.sync.hub.subscribeWorkspace(ctx.workspace.accessKeyId, (event) => {
      queue.push(event);
      wake?.();
    });
    try {
      while (!signal?.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
            signal?.addEventListener("abort", () => resolve(), { once: true });
          });
          wake = undefined;
        }
        while (queue.length > 0) yield queue.shift()!;
      }
    } finally {
      unsubscribe();
    }
  })
});

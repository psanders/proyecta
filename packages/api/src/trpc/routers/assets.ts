/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { assetIdSchema } from "@proyecta/common";
import { createDeleteAsset, createListAssets } from "../../api/assets/createAssetFunctions.js";
import { adminProcedure, router, workspaceProcedure } from "../trpc.js";
import { validate } from "../validate.js";

/** The business's file library (uploads go through POST /uploads/assets). */
export const assetsRouter = router({
  list: workspaceProcedure.query(({ ctx }) =>
    createListAssets({ db: ctx.sync.db })({ workspaceAccessKeyId: ctx.workspace.accessKeyId })
  ),

  delete: adminProcedure.input(validate(assetIdSchema)).mutation(({ ctx, input }) =>
    createDeleteAsset({ db: ctx.sync.db, store: ctx.media.store })({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  )
});

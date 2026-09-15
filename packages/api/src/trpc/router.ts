/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { adReviewRouter } from "./routers/adReview.js";
import { adsRouter } from "./routers/ads.js";
import { assetsRouter } from "./routers/assets.js";
import { authRouter } from "./routers/auth.js";
import { profileRouter } from "./routers/profile.js";
import { screensRouter } from "./routers/screens.js";
import { workspacesRouter } from "./routers/workspaces.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const })),
  auth: authRouter,
  profile: profileRouter,
  screens: screensRouter,
  workspaces: workspacesRouter,
  assets: assetsRouter,
  ads: adsRouter,
  adReview: adReviewRouter
});

export type AppRouter = typeof appRouter;
export type { Context } from "./context.js";

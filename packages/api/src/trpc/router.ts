/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { authRouter } from "./routers/auth.js";
import { profileRouter } from "./routers/profile.js";
import { workspacesRouter } from "./routers/workspaces.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const })),
  auth: authRouter,
  profile: profileRouter,
  workspaces: workspacesRouter
});

export type AppRouter = typeof appRouter;
export type { Context } from "./context.js";

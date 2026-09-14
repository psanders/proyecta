/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { initTRPC } from "@trpc/server";

/** Request context for dashboard procedures. Owner auth lands with the owner-dashboard change. */
export interface Context {
  requestId?: string;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const }))
});

export type AppRouter = typeof appRouter;

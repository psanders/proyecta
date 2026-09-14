/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import { ValidationError } from "@proyecta/common";
import { toTRPCError } from "../identity/errors.js";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const fieldErrors =
      error.cause instanceof ValidationError ? error.cause.fieldErrors : undefined;
    return { ...shape, data: { ...shape.data, fieldErrors } };
  }
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Converts validation, domain and Identity (gRPC) errors into typed tRPC errors. */
const mapErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.code === "INTERNAL_SERVER_ERROR" && result.error.cause) {
    throw toTRPCError(result.error.cause);
  }
  return result;
});

export const publicProcedure = t.procedure.use(mapErrors);

/** Requires a valid Identity access token. */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.principal || !ctx.token) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, principal: ctx.principal, token: ctx.token } });
});

/** Requires membership in the workspace named by the x-workspace header. */
export const workspaceProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.workspace) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No perteneces a este negocio" });
  }
  return next({ ctx: { ...ctx, workspace: ctx.workspace } });
});

/** Requires the owner or admin role in the active workspace. */
export const adminProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspace.role !== "WORKSPACE_OWNER" && ctx.workspace.role !== "WORKSPACE_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Necesitas ser administrador" });
  }
  return next();
});

/** Requires the owner role in the active workspace. */
export const ownerProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspace.role !== "WORKSPACE_OWNER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Necesitas ser el propietario" });
  }
  return next();
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import {
  DEFAULT_LANGUAGE,
  resolveApiMessage,
  ValidationError,
  type FieldError,
  type Language
} from "@proyecta/common";
import { DomainError, toTRPCError } from "../identity/errors.js";
import type { Context } from "./context.js";

const INTERNAL_MESSAGE = resolveApiMessage("errors.internal", "es");

/**
 * The user-facing message and field errors of a tRPC error in `language`. They are Spanish until
 * here; domain errors and catalog field messages are re-resolved, anything else passes through.
 */
export function localizeError(
  error: TRPCError,
  message: string,
  language: Language
): { message: string; fieldErrors: FieldError[] | undefined } {
  const fieldErrors =
    error.cause instanceof ValidationError ? error.cause.localizedFieldErrors(language) : undefined;
  if (error.cause instanceof DomainError) {
    return { message: resolveApiMessage(error.cause.messageId, language), fieldErrors };
  }
  if (message === INTERNAL_MESSAGE) {
    return { message: resolveApiMessage("errors.internal", language), fieldErrors };
  }
  return { message, fieldErrors };
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    const { message, fieldErrors } = localizeError(
      error,
      shape.message,
      ctx?.language ?? DEFAULT_LANGUAGE
    );
    return { ...shape, message, data: { ...shape.data, fieldErrors } };
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
    throw toTRPCError(new DomainError("FORBIDDEN", "errors.forbidden.member"));
  }
  return next({ ctx: { ...ctx, workspace: ctx.workspace } });
});

/** Requires the owner or admin role in the active workspace. */
export const adminProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspace.role !== "WORKSPACE_OWNER" && ctx.workspace.role !== "WORKSPACE_ADMIN") {
    throw toTRPCError(new DomainError("FORBIDDEN", "errors.forbidden.admin"));
  }
  return next();
});

/** Requires the owner role in the active workspace. */
export const ownerProcedure = workspaceProcedure.use(({ ctx, next }) => {
  if (ctx.workspace.role !== "WORKSPACE_OWNER") {
    throw toTRPCError(new DomainError("FORBIDDEN", "errors.forbidden.owner"));
  }
  return next();
});

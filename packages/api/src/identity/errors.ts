/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { status } from "@grpc/grpc-js";
import { TRPCError } from "@trpc/server";
import { ValidationError } from "@proyecta/common";

type Code = TRPCError["code"];

const GRPC_TO_TRPC: Partial<Record<number, Code>> = {
  [status.INVALID_ARGUMENT]: "BAD_REQUEST",
  [status.UNAUTHENTICATED]: "UNAUTHORIZED",
  [status.PERMISSION_DENIED]: "FORBIDDEN",
  [status.NOT_FOUND]: "NOT_FOUND",
  [status.ALREADY_EXISTS]: "CONFLICT",
  [status.FAILED_PRECONDITION]: "PRECONDITION_FAILED",
  [status.RESOURCE_EXHAUSTED]: "TOO_MANY_REQUESTS",
  [status.UNAVAILABLE]: "SERVICE_UNAVAILABLE"
};

/** A domain failure with a user-facing (Spanish) message and a tRPC category. */
export class DomainError extends Error {
  constructor(
    public readonly code: Code,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

function isGrpcError(err: unknown): err is { code: number; details?: string; message?: string } {
  return (
    typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "number"
  );
}

/**
 * Maps anything thrown by business logic to a TRPCError: validation errors become BAD_REQUEST
 * (field errors travel in `cause`), domain errors keep their code, and gRPC errors from Identity
 * map by status. Unknown errors stay INTERNAL_SERVER_ERROR without leaking details.
 */
export function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (err instanceof ValidationError) {
    return new TRPCError({ code: "BAD_REQUEST", message: err.message, cause: err });
  }
  if (err instanceof DomainError) {
    return new TRPCError({ code: err.code, message: err.message, cause: err });
  }
  if (isGrpcError(err)) {
    const code = GRPC_TO_TRPC[err.code];
    if (code)
      return new TRPCError({ code, message: err.details ?? err.message ?? code, cause: err });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error interno", cause: err });
}

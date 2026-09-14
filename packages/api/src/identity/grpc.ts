/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { status } from "@grpc/grpc-js";

/** True when `err` is a gRPC error with one of the given status codes. */
export function hasGrpcStatus(err: unknown, ...codes: status[]): boolean {
  const code =
    typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  return typeof code === "number" && codes.includes(code);
}

export { status as grpcStatus };

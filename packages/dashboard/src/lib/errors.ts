/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCClientError } from "@trpc/client";
import { strings } from "../strings.js";

interface ErrorData {
  code?: string;
  fieldErrors?: { field: string; message: string }[];
}

/** Field → first Spanish message, from a validation error returned by the API. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof TRPCClientError)) return {};
  const data = error.data as ErrorData | undefined;
  const result: Record<string, string> = {};
  for (const { field, message } of data?.fieldErrors ?? []) result[field] ??= message;
  return result;
}

/** A user-facing message for a failed call. Validation errors are shown per field instead. */
export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof TRPCClientError) {
    const data = error.data as ErrorData | undefined;
    if (data?.fieldErrors?.length) return null;
    if (data?.code === "INTERNAL_SERVER_ERROR") return strings.errors.generic;
    if (!data) return strings.errors.network;
    return error.message;
  }
  return strings.errors.generic;
}

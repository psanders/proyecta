/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCClientError } from "@trpc/client";
import type { Translate } from "./i18n.js";

interface ErrorData {
  code?: string;
  fieldErrors?: { field: string; message: string }[];
}

/**
 * Field → first message, from a validation error returned by the API. The API already wrote the
 * messages in the language sent as x-language.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof TRPCClientError)) return {};
  const data = error.data as ErrorData | undefined;
  const result: Record<string, string> = {};
  for (const { field, message } of data?.fieldErrors ?? []) result[field] ??= message;
  return result;
}

/** A user-facing message for a failed call. Validation errors are shown per field instead. */
export function errorMessage(error: unknown, t: Translate): string | null {
  if (!error) return null;
  if (error instanceof TRPCClientError) {
    const data = error.data as ErrorData | undefined;
    if (data?.fieldErrors?.length) return null;
    if (data?.code === "INTERNAL_SERVER_ERROR") return t("errors.generic");
    if (!data) return t("errors.network");
    return error.message;
  }
  return t("errors.generic");
}

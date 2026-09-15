/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { z } from "zod/v4";
import { isApiMessageId, resolveApiMessage } from "../i18n/apiMessages.js";
import type { Language } from "../schemas/userSettings.schema.js";

export interface FieldError {
  field: string;
  message: string;
  code: string;
  /** The catalog id behind `message`, when the schema used one (see apiMessages). */
  messageId?: string;
}

/**
 * Custom error class that wraps Zod validation errors with structured details.
 * Provides field-level errors suitable for API responses.
 */
export class ValidationError extends Error {
  public readonly code = "VALIDATION_ERROR";
  public readonly fieldErrors: FieldError[];
  public readonly zodError: z.ZodError;

  constructor(zodError: z.ZodError) {
    const fieldErrors = ValidationError.extractFieldErrors(zodError);
    const message = ValidationError.formatMessage(fieldErrors);

    super(message);
    this.name = "ValidationError";
    this.zodError = zodError;
    this.fieldErrors = fieldErrors;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /** The field errors with catalog messages in `language` (Spanish is what `fieldErrors` holds). */
  public localizedFieldErrors(language: Language): FieldError[] {
    return this.fieldErrors.map((e) =>
      e.messageId ? { ...e, message: resolveApiMessage(e.messageId, language) } : e
    );
  }

  /**
   * Extracts field-level errors from a ZodError for API responses. Catalog ids resolve to Spanish.
   */
  private static extractFieldErrors(zodError: z.ZodError): FieldError[] {
    return zodError.issues.map((issue) => ({
      field: issue.path.join("."),
      message: resolveApiMessage(issue.message, "es"),
      code: issue.code,
      ...(isApiMessageId(issue.message) ? { messageId: issue.message } : {})
    }));
  }

  /**
   * Builds a single human-readable message from the field errors.
   */
  private static formatMessage(fieldErrors: FieldError[]): string {
    if (fieldErrors.length === 0) return "Validation failed";
    return fieldErrors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join("; ");
  }
}

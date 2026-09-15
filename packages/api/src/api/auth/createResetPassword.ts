/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  resetPasswordSchema,
  withErrorHandlingAndValidation,
  type ResetPasswordInput
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import type { IdentityApi } from "../../identity/types.js";

const INVALID_LINK = "errors.auth.invalidResetLink";

/** Decodes Identity's reset token: base64 JSON of { username, code }. */
export function decodeResetToken(token: string): { username: string; code: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
    return typeof payload.username === "string" && typeof payload.code === "string"
      ? { username: payload.username, code: payload.code }
      : null;
  } catch {
    return null;
  }
}

/**
 * Creates a function that completes a password reset from the emailed link's token.
 *
 * @param identity - Injected Identity client
 */
export function createResetPassword(identity: Pick<IdentityApi, "resetPassword">) {
  const fn = async (params: ResetPasswordInput): Promise<{ reset: true }> => {
    const decoded = decodeResetToken(params.token);
    if (!decoded) throw new DomainError("BAD_REQUEST", INVALID_LINK);
    try {
      await identity.resetPassword(decoded.username, params.password, decoded.code);
    } catch {
      throw new DomainError("BAD_REQUEST", INVALID_LINK);
    }
    return { reset: true };
  };

  return withErrorHandlingAndValidation(fn, resetPasswordSchema);
}

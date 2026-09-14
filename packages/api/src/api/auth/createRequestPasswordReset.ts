/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  requestPasswordResetSchema,
  withErrorHandlingAndValidation,
  type RequestPasswordResetInput
} from "@proyecta/common";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

/**
 * Creates a function that emails a password-reset link. It resolves the same way whether or not
 * the email has an account.
 *
 * @param identity - Injected Identity client
 * @param resetUrl - Dashboard page that completes the reset
 */
export function createRequestPasswordReset(
  identity: Pick<IdentityApi, "sendResetPasswordCode">,
  resetUrl: string
) {
  const fn = async (params: RequestPasswordResetInput): Promise<{ sent: true }> => {
    logger.verbose("password reset requested");
    try {
      await identity.sendResetPasswordCode(params.email, resetUrl);
    } catch (err) {
      // Never reveal account existence or mail failures to the caller.
      logger.warn("password reset email failed", { error: (err as Error).message });
    }
    return { sent: true };
  };

  return withErrorHandlingAndValidation(fn, requestPasswordResetSchema);
}

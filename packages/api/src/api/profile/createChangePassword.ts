/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  changePasswordSchema,
  emailSchema,
  withErrorHandlingAndValidation
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

const schema = changePasswordSchema.extend({
  userRef: z.string().min(1),
  email: emailSchema,
  token: z.string().min(1)
});

/**
 * Creates a function that changes the caller's password after confirming the current one
 * (Identity's UpdateUser doesn't check it).
 *
 * @param identity - Injected Identity client
 */
export function createChangePassword(
  identity: Pick<IdentityApi, "exchangeCredentials" | "updateUser">
) {
  const fn = async (params: z.infer<typeof schema>): Promise<{ changed: true }> => {
    logger.verbose("changing password", { userRef: params.userRef });
    try {
      await identity.exchangeCredentials({
        username: params.email,
        password: params.currentPassword
      });
    } catch {
      throw new DomainError("BAD_REQUEST", "errors.profile.wrongPassword");
    }
    await identity.updateUser({ ref: params.userRef, password: params.newPassword }, params.token);
    return { changed: true };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

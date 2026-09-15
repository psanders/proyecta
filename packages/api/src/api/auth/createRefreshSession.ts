/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  refreshSessionSchema,
  withErrorHandlingAndValidation,
  type RefreshSessionInput,
  type Session
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import type { IdentityApi } from "../../identity/types.js";

/**
 * Creates a function that renews a session with a refresh token. Any failure means the client
 * must sign in again.
 *
 * @param identity - Injected Identity client
 */
export function createRefreshSession(identity: Pick<IdentityApi, "exchangeRefreshToken">) {
  const fn = async (params: RefreshSessionInput): Promise<Session> => {
    try {
      const { accessToken, refreshToken } = await identity.exchangeRefreshToken(
        params.refreshToken
      );
      return { accessToken, refreshToken };
    } catch {
      throw new DomainError("UNAUTHORIZED", "errors.session.expired");
    }
  };

  return withErrorHandlingAndValidation(fn, refreshSessionSchema);
}

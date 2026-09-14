/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  signInSchema,
  withErrorHandlingAndValidation,
  type Session,
  type SignInInput
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import { grpcStatus, hasGrpcStatus } from "../../identity/grpc.js";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

export const INVALID_CREDENTIALS = "Correo o contraseña incorrectos";

/**
 * Creates a function that exchanges email + password for a session. Every credential failure
 * surfaces the same message, so it never reveals whether the email exists.
 *
 * @param identity - Injected Identity client
 */
export function createSignIn(identity: Pick<IdentityApi, "exchangeCredentials">) {
  const fn = async (params: SignInInput): Promise<Session> => {
    logger.verbose("signing in");
    try {
      const { accessToken, refreshToken } = await identity.exchangeCredentials({
        username: params.email,
        password: params.password
      });
      return { accessToken, refreshToken };
    } catch (err) {
      if (
        hasGrpcStatus(
          err,
          grpcStatus.PERMISSION_DENIED,
          grpcStatus.UNAUTHENTICATED,
          grpcStatus.NOT_FOUND
        )
      ) {
        throw new DomainError("UNAUTHORIZED", INVALID_CREDENTIALS);
      }
      throw err;
    }
  };

  return withErrorHandlingAndValidation(fn, signInSchema);
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  signUpSchema,
  withErrorHandlingAndValidation,
  type Session,
  type SignUpInput
} from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import { grpcStatus, hasGrpcStatus } from "../../identity/grpc.js";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

export interface SignUpResult extends Session {
  workspace: { ref: string; accessKeyId: string; name: string };
}

/**
 * Creates a function that signs up an owner: creates the Identity user, signs them in, creates
 * their first workspace (the business), and refreshes the session so the token includes it.
 *
 * @param identity - Injected Identity client
 */
export function createSignUp(
  identity: Pick<
    IdentityApi,
    | "createUser"
    | "exchangeCredentials"
    | "createWorkspace"
    | "getWorkspace"
    | "exchangeRefreshToken"
  >
) {
  const fn = async (params: SignUpInput): Promise<SignUpResult> => {
    logger.verbose("signing up owner");

    try {
      await identity.createUser({
        name: params.name,
        email: params.email,
        password: params.password
      });
    } catch (err) {
      if (hasGrpcStatus(err, grpcStatus.ALREADY_EXISTS)) {
        throw new DomainError("CONFLICT", "errors.auth.accountExists");
      }
      throw err;
    }

    const first = await identity.exchangeCredentials({
      username: params.email,
      password: params.password
    });
    const { ref } = await identity.createWorkspace(params.businessName, first.accessToken);
    const workspace = await identity.getWorkspace(ref, first.accessToken);
    // The first access token predates the workspace; refresh so its access claim includes it.
    const session = await identity.exchangeRefreshToken(first.refreshToken);

    logger.verbose("owner signed up", { workspaceRef: ref });
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      workspace: { ref, accessKeyId: workspace.accessKeyId, name: workspace.name }
    };
  };

  return withErrorHandlingAndValidation(fn, signUpSchema);
}

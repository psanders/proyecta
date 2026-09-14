/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { acceptInvitationSchema, withErrorHandlingAndValidation } from "@proyecta/common";
import { z } from "zod/v4";
import { DomainError } from "../../identity/errors.js";
import { logger } from "../../logger.js";

/**
 * Creates a function that accepts a workspace invitation. Identity's HTTP bridge always answers
 * with a redirect: to the app on success, to the failure URL otherwise.
 *
 * @param deps - Bridge base URL, the failure path Identity redirects to, and an injected fetch
 */
export function createAcceptInvitation(deps: {
  bridgeUrl: string;
  failPath: string;
  fetch: typeof fetch;
}) {
  const fn = async (
    params: z.infer<typeof acceptInvitationSchema>
  ): Promise<{ accepted: true }> => {
    const url = `${deps.bridgeUrl}/api/identity/accept-invite?token=${encodeURIComponent(params.token)}`;
    const response = await deps.fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000)
    });
    if (response.status < 300 || response.status >= 400) {
      logger.warn("unexpected invite bridge response", { status: response.status });
      throw new DomainError(
        "SERVICE_UNAVAILABLE",
        "No pudimos validar la invitación. Intenta de nuevo."
      );
    }
    const location = response.headers.get("location") ?? "";
    if (location.includes(deps.failPath)) {
      throw new DomainError("BAD_REQUEST", "La invitación no es válida o ya expiró");
    }
    return { accepted: true };
  };

  return withErrorHandlingAndValidation(fn, acceptInvitationSchema);
}

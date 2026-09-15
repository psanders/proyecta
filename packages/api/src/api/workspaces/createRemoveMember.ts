/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { withErrorHandlingAndValidation } from "@proyecta/common";
import { DomainError } from "../../identity/errors.js";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

const schema = z.object({
  userRef: z.string().min(1, "Falta el miembro"),
  workspaceAccessKeyId: z.string().min(1),
  token: z.string().min(1)
});

/**
 * Creates a function that removes a member (or cancels a pending invitation). The workspace owner
 * can never be removed.
 *
 * @param identity - Injected Identity client
 */
export function createRemoveMember(
  identity: Pick<IdentityApi, "listWorkspaces" | "removeUserFromWorkspace">
) {
  const fn = async (params: z.infer<typeof schema>): Promise<{ removed: true }> => {
    const { items } = await identity.listWorkspaces(params.token);
    const workspace = items.find((w) => w.accessKeyId === params.workspaceAccessKeyId);
    if (!workspace) throw new DomainError("NOT_FOUND", "errors.workspace.notFound");
    if (workspace.ownerRef === params.userRef) {
      throw new DomainError("FORBIDDEN", "errors.member.removeOwner");
    }
    logger.verbose("removing member", { userRef: params.userRef });
    await identity.removeUserFromWorkspace(
      params.userRef,
      params.workspaceAccessKeyId,
      params.token
    );
    return { removed: true };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

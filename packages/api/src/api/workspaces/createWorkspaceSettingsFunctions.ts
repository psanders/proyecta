/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  DEFAULT_TIMEZONE,
  createWorkspaceSchema,
  deleteWorkspaceSchema,
  updateWorkspaceSettingsSchema,
  withErrorHandlingAndValidation,
  type WorkspaceSettingsView
} from "@proyecta/common";
import type { DbClient } from "../../db.js";
import { DomainError } from "../../identity/errors.js";
import type { IdentityApi } from "../../identity/types.js";
import { logger } from "../../logger.js";

const caller = {
  workspaceAccessKeyId: z.string().min(1),
  role: z.string().min(1),
  token: z.string().min(1)
};

type SettingsIdentity = Pick<
  IdentityApi,
  "listWorkspaces" | "updateWorkspace" | "deleteWorkspace" | "createWorkspace"
>;

async function findWorkspace(identity: SettingsIdentity, token: string, accessKeyId: string) {
  const { items } = await identity.listWorkspaces(token);
  const workspace = items.find((w) => w.accessKeyId === accessKeyId);
  if (!workspace) throw new DomainError("NOT_FOUND", "Negocio no encontrado");
  return workspace;
}

/** The time zone for a workspace's calendar-day windows (default when never set). */
export async function workspaceTimeZone(
  db: Pick<DbClient, "workspaceSettings">,
  workspaceAccessKeyId: string
): Promise<string> {
  const row = await db.workspaceSettings.findUnique({ where: { workspaceAccessKeyId } });
  return row?.timezone ?? DEFAULT_TIMEZONE;
}

/**
 * Creates a function that reads the active business's settings: name (Identity), time zone
 * (Proyecta) and the fixed US$ currency.
 *
 * @param deps - Injected database client and Identity client
 */
export function createGetWorkspaceSettings(deps: { db: DbClient; identity: SettingsIdentity }) {
  const schema = z.object(caller);
  const fn = async (params: z.infer<typeof schema>): Promise<WorkspaceSettingsView> => {
    const workspace = await findWorkspace(deps.identity, params.token, params.workspaceAccessKeyId);
    return {
      name: workspace.name,
      timezone: await workspaceTimeZone(deps.db, params.workspaceAccessKeyId),
      currency: "USD",
      canEdit: params.role === "WORKSPACE_OWNER" || params.role === "WORKSPACE_ADMIN",
      isOwner: params.role === "WORKSPACE_OWNER"
    };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that saves the business name (in Identity, only when it changed) and time zone.
 *
 * @param deps - Injected database client and Identity client
 */
export function createUpdateWorkspaceSettings(deps: { db: DbClient; identity: SettingsIdentity }) {
  const schema = updateWorkspaceSettingsSchema.extend(caller);
  const fn = async (params: z.infer<typeof schema>): Promise<{ saved: true }> => {
    const workspace = await findWorkspace(deps.identity, params.token, params.workspaceAccessKeyId);
    if (workspace.name !== params.name) {
      await deps.identity.updateWorkspace(workspace.ref, params.name, params.token);
    }
    await deps.db.workspaceSettings.upsert({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId },
      create: { workspaceAccessKeyId: params.workspaceAccessKeyId, timezone: params.timezone },
      update: { timezone: params.timezone }
    });
    logger.verbose("workspace settings saved", { workspace: params.workspaceAccessKeyId });
    return { saved: true };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that deletes a business. Refused while any of its screens has a linked player;
 * otherwise its screens are soft-deleted (play logs kept) and the Identity workspace is deleted.
 *
 * @param deps - Injected database client, Identity client and clock
 */
export function createDeleteWorkspace(deps: {
  db: DbClient;
  identity: SettingsIdentity;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  const schema = deleteWorkspaceSchema.extend(caller);
  const fn = async (params: z.infer<typeof schema>): Promise<{ deleted: true }> => {
    const workspace = await findWorkspace(deps.identity, params.token, params.workspaceAccessKeyId);
    const linked = await deps.db.deviceBinding.count({
      where: {
        unlinkedAt: null,
        screen: { workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null }
      }
    });
    if (linked > 0) {
      throw new DomainError(
        "PRECONDITION_FAILED",
        "Desvincula todos los reproductores antes de eliminar el negocio"
      );
    }
    await deps.db.screen.updateMany({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null },
      data: { deletedAt: now() }
    });
    await deps.identity.deleteWorkspace(workspace.ref, params.token);
    logger.verbose("workspace deleted", { workspace: params.workspaceAccessKeyId });
    return { deleted: true };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that creates a business owned by the caller (used when they have none).
 * The client refreshes its session afterwards so the token includes the new business.
 *
 * @param identity - Injected Identity client
 */
export function createCreateWorkspace(identity: SettingsIdentity) {
  const schema = createWorkspaceSchema.extend({ token: z.string().min(1) });
  const fn = async (params: z.infer<typeof schema>): Promise<{ ref: string }> => {
    const { ref } = await identity.createWorkspace(params.name, params.token);
    logger.verbose("workspace created", { ref });
    return { ref };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

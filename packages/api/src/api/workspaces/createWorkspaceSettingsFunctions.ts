/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  DEFAULT_DASHBOARD_VIEW,
  DEFAULT_TIMEZONE,
  createWorkspaceSchema,
  deleteWorkspaceSchema,
  setDashboardViewSchema,
  updateWorkspaceSettingsSchema,
  withErrorHandlingAndValidation,
  type WorkspaceActivity,
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
  if (!workspace) throw new DomainError("NOT_FOUND", "errors.workspace.notFound");
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
 * Creates a function that reads the active business's settings: name (Identity), time zone and
 * dashboard view (Proyecta) and the fixed US$ currency.
 *
 * @param deps - Injected database client and Identity client
 */
export function createGetWorkspaceSettings(deps: { db: DbClient; identity: SettingsIdentity }) {
  const schema = z.object(caller);
  const fn = async (params: z.infer<typeof schema>): Promise<WorkspaceSettingsView> => {
    const workspace = await findWorkspace(deps.identity, params.token, params.workspaceAccessKeyId);
    const row = await deps.db.workspaceSettings.findUnique({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId }
    });
    return {
      name: workspace.name,
      timezone: row?.timezone ?? DEFAULT_TIMEZONE,
      dashboardView: row?.dashboardView ?? DEFAULT_DASHBOARD_VIEW,
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
      throw new DomainError("PRECONDITION_FAILED", "errors.workspace.linkedPlayers");
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
export function createCreateWorkspace(deps: {
  identity: Pick<IdentityApi, "createWorkspace" | "getWorkspace">;
  db: Pick<DbClient, "workspaceSettings">;
}) {
  const schema = createWorkspaceSchema.extend({ token: z.string().min(1) });
  const fn = async (params: z.infer<typeof schema>): Promise<{ ref: string }> => {
    const { ref } = await deps.identity.createWorkspace(params.name, params.token);
    if (params.dashboardView) {
      const { accessKeyId } = await deps.identity.getWorkspace(ref, params.token);
      await deps.db.workspaceSettings.upsert({
        where: { workspaceAccessKeyId: accessKeyId },
        create: { workspaceAccessKeyId: accessKeyId, dashboardView: params.dashboardView },
        update: { dashboardView: params.dashboardView }
      });
    }
    logger.verbose("workspace created", { ref });
    return { ref };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that changes which sides of the dashboard the business sees. Presentation
 * only: nothing else reads the view.
 *
 * @param deps - Injected database client
 */
export function createSetDashboardView(deps: { db: Pick<DbClient, "workspaceSettings"> }) {
  const schema = setDashboardViewSchema.extend({ workspaceAccessKeyId: z.string().min(1) });
  const fn = async (params: z.infer<typeof schema>): Promise<{ saved: true }> => {
    await deps.db.workspaceSettings.upsert({
      where: { workspaceAccessKeyId: params.workspaceAccessKeyId },
      create: {
        workspaceAccessKeyId: params.workspaceAccessKeyId,
        dashboardView: params.dashboardView
      },
      update: { dashboardView: params.dashboardView }
    });
    logger.verbose("dashboard view saved", {
      workspace: params.workspaceAccessKeyId,
      view: params.dashboardView
    });
    return { saved: true };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that counts what keeps running on each side of a business (linked screens,
 * ads on air or scheduled), for the view-switch confirmation.
 *
 * @param deps - Injected database client and clock
 */
export function createGetWorkspaceActivity(deps: {
  db: Pick<DbClient, "deviceBinding" | "ad">;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  const schema = z.object({ workspaceAccessKeyId: z.string().min(1) });
  const fn = async (params: z.infer<typeof schema>): Promise<WorkspaceActivity> => {
    const [linkedScreens, activeAds] = await Promise.all([
      deps.db.deviceBinding.count({
        where: {
          unlinkedAt: null,
          screen: { workspaceAccessKeyId: params.workspaceAccessKeyId, deletedAt: null }
        }
      }),
      deps.db.ad.count({
        where: {
          workspaceAccessKeyId: params.workspaceAccessKeyId,
          state: "SUBMITTED",
          endsAt: { gt: now() },
          placements: { some: { status: "APPROVED" } }
        }
      })
    ]);
    return { linkedScreens, activeAds };
  };
  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { DomainError, toTRPCError } from "../../identity/errors.js";
import {
  acceptInvitationSchema,
  createWorkspaceSchema,
  deleteWorkspaceSchema,
  updateWorkspaceSettingsSchema,
  inviteMemberSchema,
  memberRefSchema,
  renameWorkspaceSchema,
  setDashboardViewSchema,
  type WorkspaceRole
} from "@proyecta/common";
import {
  createAcceptInvitation,
  createCreateWorkspace,
  createDeleteWorkspace,
  createGetWorkspaceActivity,
  createGetWorkspaceSettings,
  createRemoveMember,
  createSetDashboardView,
  createUpdateWorkspaceSettings
} from "../../api/workspaces/index.js";
import { grpcStatus, hasGrpcStatus } from "../../identity/grpc.js";
import { validate } from "../validate.js";
import {
  adminProcedure,
  ownerProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  workspaceProcedure
} from "../trpc.js";

export const INVITE_FAIL_PATH = "/invitation-invalid";

export interface MemberView {
  userRef: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: "ACTIVE" | "PENDING";
}

export const workspacesRouter = router({
  /** Businesses the caller owns or belongs to, with their role in each. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { items } = await ctx.identity.listWorkspaces(ctx.token);
    return items.map((w) => ({
      ref: w.ref,
      accessKeyId: w.accessKeyId,
      name: w.name,
      role: (w.ownerRef === ctx.principal.userRef
        ? "WORKSPACE_OWNER"
        : (ctx.principal.access.find((a) => a.accessKeyId === w.accessKeyId)?.role ??
          "WORKSPACE_MEMBER")) as WorkspaceRole
    }));
  }),

  rename: adminProcedure.input(validate(renameWorkspaceSchema)).mutation(async ({ ctx, input }) => {
    const { items } = await ctx.identity.listWorkspaces(ctx.token);
    const workspace = items.find((w) => w.accessKeyId === ctx.workspace.accessKeyId);
    if (!workspace) throw toTRPCError(new DomainError("NOT_FOUND", "errors.workspace.notFound"));
    await ctx.identity.updateWorkspace(workspace.ref, input.name, ctx.token);
    return { renamed: true as const };
  }),

  /** Owner first, then members and pending invitations. */
  members: workspaceProcedure.query(async ({ ctx }): Promise<MemberView[]> => {
    const [{ items: workspaces }, { items: members }] = await Promise.all([
      ctx.identity.listWorkspaces(ctx.token),
      ctx.identity.listWorkspaceMembers(ctx.workspace.accessKeyId, ctx.token)
    ]);
    const owner = workspaces.find((w) => w.accessKeyId === ctx.workspace.accessKeyId)?.owner;
    const ownerView: MemberView[] = owner
      ? [
          {
            userRef: owner.ref,
            name: owner.name,
            email: owner.email,
            role: "WORKSPACE_OWNER",
            status: "ACTIVE"
          }
        ]
      : [];
    return [
      ...ownerView,
      ...members
        .filter((m) => m.userRef !== owner?.ref)
        .map((m) => ({
          userRef: m.userRef,
          name: m.name,
          email: m.email,
          role: m.role as WorkspaceRole,
          status: m.status === "ACTIVE" ? ("ACTIVE" as const) : ("PENDING" as const)
        }))
    ];
  }),

  invite: adminProcedure.input(validate(inviteMemberSchema)).mutation(async ({ ctx, input }) => {
    try {
      const { userRef } = await ctx.identity.inviteUserToWorkspace(
        { email: input.email, role: input.role, name: input.name ?? input.email.split("@")[0]! },
        ctx.workspace.accessKeyId,
        ctx.token
      );
      return { userRef };
    } catch (err) {
      if (hasGrpcStatus(err, grpcStatus.ALREADY_EXISTS)) {
        throw toTRPCError(new DomainError("CONFLICT", "errors.member.alreadyInWorkspace"));
      }
      throw err;
    }
  }),

  resendInvitation: adminProcedure
    .input(validate(memberRefSchema))
    .mutation(async ({ ctx, input }) => {
      await ctx.identity.resendWorkspaceMembershipInvitation(
        input.userRef,
        ctx.workspace.accessKeyId,
        ctx.token
      );
      return { resent: true as const };
    }),

  removeMember: adminProcedure.input(validate(memberRefSchema)).mutation(({ ctx, input }) =>
    createRemoveMember(ctx.identity)({
      userRef: input.userRef,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      token: ctx.token
    })
  ),

  acceptInvitation: publicProcedure
    .input(validate(acceptInvitationSchema))
    .mutation(({ ctx, input }) =>
      createAcceptInvitation({
        bridgeUrl: ctx.identityBridgeUrl,
        failPath: INVITE_FAIL_PATH,
        fetch: ctx.fetch
      })(input)
    ),

  settings: workspaceProcedure.query(({ ctx }) =>
    createGetWorkspaceSettings({ db: ctx.sync.db, identity: ctx.identity })({
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      role: ctx.workspace.role,
      token: ctx.token
    })
  ),

  updateSettings: adminProcedure
    .input(validate(updateWorkspaceSettingsSchema))
    .mutation(({ ctx, input }) =>
      createUpdateWorkspaceSettings({ db: ctx.sync.db, identity: ctx.identity })({
        ...input,
        workspaceAccessKeyId: ctx.workspace.accessKeyId,
        role: ctx.workspace.role,
        token: ctx.token
      })
    ),

  delete: ownerProcedure.input(validate(deleteWorkspaceSchema)).mutation(({ ctx, input }) =>
    createDeleteWorkspace({ db: ctx.sync.db, identity: ctx.identity })({
      ...input,
      workspaceAccessKeyId: ctx.workspace.accessKeyId,
      role: ctx.workspace.role,
      token: ctx.token
    })
  ),

  create: protectedProcedure.input(validate(createWorkspaceSchema)).mutation(({ ctx, input }) =>
    createCreateWorkspace({ identity: ctx.identity, db: ctx.sync.db })({
      ...input,
      token: ctx.token
    })
  ),

  setDashboardView: adminProcedure
    .input(validate(setDashboardViewSchema))
    .mutation(({ ctx, input }) =>
      createSetDashboardView({ db: ctx.sync.db })({
        ...input,
        workspaceAccessKeyId: ctx.workspace.accessKeyId
      })
    ),

  /** What keeps running on each side, for the view-switch confirmation. */
  activity: workspaceProcedure.query(({ ctx }) =>
    createGetWorkspaceActivity({ db: ctx.sync.db, now: ctx.sync.now })({
      workspaceAccessKeyId: ctx.workspace.accessKeyId
    })
  )
});

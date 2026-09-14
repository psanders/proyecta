/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCError } from "@trpc/server";
import {
  acceptInvitationSchema,
  inviteMemberSchema,
  memberRefSchema,
  renameWorkspaceSchema,
  type WorkspaceRole
} from "@proyecta/common";
import { createAcceptInvitation, createRemoveMember } from "../../api/workspaces/index.js";
import { grpcStatus, hasGrpcStatus } from "../../identity/grpc.js";
import { validate } from "../validate.js";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  workspaceProcedure
} from "../trpc.js";

export const INVITE_FAIL_PATH = "/invitacion-invalida";

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
    if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "Negocio no encontrado" });
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
        throw new TRPCError({ code: "CONFLICT", message: "Esta persona ya es parte del negocio" });
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
    )
});

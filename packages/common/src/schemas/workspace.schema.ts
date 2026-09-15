/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import { businessNameSchema, emailSchema, personNameSchema } from "./auth.schema.js";

/** Identity roles. Owners are set at creation and can't be invited. */
export const WORKSPACE_ROLES = ["WORKSPACE_OWNER", "WORKSPACE_ADMIN", "WORKSPACE_MEMBER"] as const;
export const workspaceRoleSchema = z.enum(WORKSPACE_ROLES, { error: "validation.role.invalid" });
export const invitableRoleSchema = z.enum(["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"], {
  error: "validation.role.invitable"
});

export const renameWorkspaceSchema = z.object({ name: businessNameSchema });

export const inviteMemberSchema = z.object({
  email: emailSchema,
  name: personNameSchema.optional(),
  role: invitableRoleSchema
});

export const memberRefSchema = z.object({
  userRef: z.string().min(1, "validation.member.required")
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "validation.invitation.invalid")
});

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type MemberRefInput = z.infer<typeof memberRefSchema>;

/** True for roles that can manage screens and members. */
export function canManage(role: string | undefined): boolean {
  return role === "WORKSPACE_OWNER" || role === "WORKSPACE_ADMIN";
}

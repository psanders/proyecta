/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { IdentityClient } from "@fonoster/identity-client";

/** The Identity operations Proyecta uses. Satisfied by IdentityClient; stubbed in tests. */
export type IdentityApi = Pick<
  IdentityClient,
  | "getPublicKey"
  | "createUser"
  | "exchangeCredentials"
  | "exchangeRefreshToken"
  | "createWorkspace"
  | "deleteWorkspace"
  | "getWorkspace"
  | "listWorkspaces"
  | "updateWorkspace"
  | "listWorkspaceMembers"
  | "inviteUserToWorkspace"
  | "resendWorkspaceMembershipInvitation"
  | "removeUserFromWorkspace"
  | "getUser"
  | "updateUser"
  | "sendResetPasswordCode"
  | "resetPassword"
>;

export interface WorkspaceAccess {
  accessKeyId: string;
  role: string;
}

/** The authenticated caller, taken from a verified Identity access token. */
export interface Principal {
  userRef: string;
  accessKeyId: string;
  access: WorkspaceAccess[];
}

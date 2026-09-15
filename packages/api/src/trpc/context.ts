/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { IncomingHttpHeaders } from "node:http";
import { parseLanguage, type Language } from "@proyecta/common";
import type { DeviceSyncDeps } from "../api/screens/deps.js";
import type { IdentityApi, Principal, WorkspaceAccess } from "../identity/types.js";

export const WORKSPACE_HEADER = "x-workspace";
export const LANGUAGE_HEADER = "x-language";

/** Long-lived services shared by every request. */
export interface Services {
  identity: IdentityApi;
  verifyAccessToken: (token: string) => Promise<Principal | null>;
  dashboardUrl: string;
  identityBridgeUrl: string;
  fetch: typeof fetch;
  sync: DeviceSyncDeps;
  pairingLimiter: { take: (key: string) => boolean };
}

export interface Context extends Services {
  token: string | null;
  principal: Principal | null;
  /** Set only when the caller belongs to the requested workspace. */
  workspace: WorkspaceAccess | null;
  /** Language for user-facing API messages (x-language header; Spanish by default). */
  language: Language;
}

function header(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/**
 * Resolves the caller from the bearer token and the active workspace from x-workspace. Event
 * stream subscriptions can't send headers, so they pass `{ token, workspace }` as tRPC
 * connection params instead.
 */
export async function resolveContext(
  services: Services,
  headers: IncomingHttpHeaders,
  connectionParams?: Record<string, string> | null
): Promise<Context> {
  const authorization = header(headers, "authorization");
  const token =
    (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null) ??
    connectionParams?.token ??
    null;
  const principal = token ? await services.verifyAccessToken(token) : null;
  const requested = header(headers, WORKSPACE_HEADER) ?? connectionParams?.workspace ?? null;
  const workspace =
    (principal && requested && principal.access.find((a) => a.accessKeyId === requested)) || null;
  const language = parseLanguage(header(headers, LANGUAGE_HEADER) ?? connectionParams?.language);
  return { ...services, token: principal ? token : null, principal, workspace, language };
}

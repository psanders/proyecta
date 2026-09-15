/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@proyecta/api/router";
import type { AssetView } from "@proyecta/common";
import { currentLanguage } from "./i18n.js";
import { session } from "./session.js";
import { refreshSession } from "./trpc.js";

export interface UploadInput {
  file: File;
  name: string;
  /** Required for images: 5000, 10000 or 15000. */
  durationMs?: number;
}

/**
 * Uploads a file to POST /uploads/assets (the raw file as the body; tRPC can't stream uploads).
 * Errors come back in tRPC's shape and are rethrown as TRPCClientError, so `errorMessage` and
 * `fieldErrors` read them like any other call. An expired session is renewed once.
 */
export async function uploadAsset({ file, name, durationMs }: UploadInput): Promise<AssetView> {
  const query = new URLSearchParams({ name, fileName: file.name });
  if (durationMs) query.set("durationMs", String(durationMs));

  const send = () => {
    const current = session.get();
    return fetch(`/uploads/assets?${query}`, {
      method: "POST",
      headers: {
        "content-type": file.type || "application/octet-stream",
        "x-language": currentLanguage(),
        ...(current ? { authorization: `Bearer ${current.accessToken}` } : {}),
        ...(current?.workspace ? { "x-workspace": current.workspace } : {})
      },
      body: file
    });
  };

  let response = await send();
  if (response.status === 401 && (await refreshSession())) response = await send();
  const body = (await response.json().catch(() => null)) as
    { asset: AssetView } | { error: { message: string; code: number; data: unknown } } | null;
  if (response.ok && body && "asset" in body) return body.asset;
  if (body && "error" in body) {
    throw TRPCClientError.from<AppRouter>({ error: body.error } as never);
  }
  throw new Error(`upload failed with ${response.status}`);
}

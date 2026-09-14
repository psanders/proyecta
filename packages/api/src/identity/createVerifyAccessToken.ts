/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { importSPKI, jwtVerify } from "jose";
import type { Principal, WorkspaceAccess } from "./types.js";

interface VerifyAccessTokenDeps {
  /** Returns Identity's PEM public key (fetched once via GetPublicKey). */
  loadPublicKey: () => Promise<string>;
  issuer: string;
  audience: string;
}

/**
 * Creates a verifier for Identity access tokens: RS256 signature, issuer, audience, expiry, and
 * `tokenUse === "access"` (so id and refresh tokens are rejected). Resolves null when invalid.
 */
export function createVerifyAccessToken(deps: VerifyAccessTokenDeps) {
  let keyPromise: Promise<CryptoKey> | undefined;
  const getKey = () => {
    keyPromise ??= deps
      .loadPublicKey()
      .then((pem) => importSPKI(pem, "RS256"))
      .catch((err: unknown) => {
        keyPromise = undefined; // Retry the key load on the next request.
        throw err;
      });
    return keyPromise;
  };

  return async (token: string): Promise<Principal | null> => {
    try {
      const { payload } = await jwtVerify(token, await getKey(), {
        algorithms: ["RS256"],
        issuer: deps.issuer,
        audience: deps.audience
      });
      if (payload.tokenUse !== "access" || typeof payload.sub !== "string") return null;
      if (typeof payload.accessKeyId !== "string") return null;
      const access = Array.isArray(payload.access) ? (payload.access as WorkspaceAccess[]) : [];
      return { userRef: payload.sub, accessKeyId: payload.accessKeyId, access };
    } catch {
      return null;
    }
  };
}

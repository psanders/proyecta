/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { errors, importSPKI, jwtVerify } from "jose";
import { logger } from "../logger.js";
import type { Principal, WorkspaceAccess } from "./types.js";

interface VerifyAccessTokenDeps {
  /** Returns Identity's PEM public key (fetched once via GetPublicKey). */
  loadPublicKey: () => Promise<string>;
  /** Must match `issuer` in Identity's identity.json. */
  issuer: string;
  /** Must match `audience` in Identity's identity.json. */
  audience: string;
  warn?: (message: string, meta: Record<string, unknown>) => void;
}

/**
 * Creates a verifier for Identity access tokens: RS256 signature, issuer, audience, expiry, and
 * `tokenUse === "access"` (so id and refresh tokens are rejected). Resolves null when invalid.
 */
export function createVerifyAccessToken(deps: VerifyAccessTokenDeps) {
  const warn = deps.warn ?? ((message, meta) => logger.warn(message, meta));
  // A wrong issuer or audience rejects every sign-in, which users only see as an expired session.
  // Say so in the logs, once per unexpected value.
  const reported = new Set<string>();
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
    } catch (err) {
      if (
        err instanceof errors.JWTClaimValidationFailed &&
        (err.claim === "iss" || err.claim === "aud")
      ) {
        const received = err.payload[err.claim];
        const key = `${err.claim}:${JSON.stringify(received)}`;
        if (!reported.has(key)) {
          reported.add(key);
          warn("access token rejected: issuer/audience don't match Identity's tokens", {
            claim: err.claim,
            expected: err.claim === "iss" ? deps.issuer : deps.audience,
            received,
            fix: "set identity.issuer/audience in config/proyecta.json to match identity.json"
          });
        }
      }
      return null;
    }
  };
}

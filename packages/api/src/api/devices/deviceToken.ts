/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createHash, randomBytes } from "node:crypto";

/** A new random device credential (256 bits, base64url). */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored only as SHA-256 hashes. */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

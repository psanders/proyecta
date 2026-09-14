/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/**
 * Pairing codes identify a PHYSICAL device and never change.
 * 8 characters from a 32-symbol alphabet without the look-alikes 0, O, 1 and I.
 * Stored canonically without the dash ("8F3K2QLM"), displayed as "8F3K-2QLM".
 */
export const PAIRING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const PAIRING_CODE_LENGTH = 8;

const CANONICAL = new RegExp(`^[${PAIRING_CODE_ALPHABET}]{${PAIRING_CODE_LENGTH}}$`);

/** Canonicalizes user input: trims, uppercases and drops dashes/spaces. */
export function normalizePairingCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** True when the value is a canonical (normalized) pairing code. */
export function isPairingCode(value: string): boolean {
  return CANONICAL.test(value);
}

/** Formats a canonical code for display: "8F3K2QLM" becomes "8F3K-2QLM". */
export function formatPairingCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Generates a random canonical pairing code.
 *
 * @param randomBytes - Source of cryptographically secure random bytes (injected for tests)
 */
export function generatePairingCode(
  randomBytes: (size: number) => Uint8Array = (size) => crypto.getRandomValues(new Uint8Array(size))
): string {
  // 256 is a multiple of 32, so masking the low 5 bits is unbiased.
  return Array.from(randomBytes(PAIRING_CODE_LENGTH), (b) => PAIRING_CODE_ALPHABET[b & 31]).join(
    ""
  );
}

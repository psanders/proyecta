/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/** Pay-per-display bills in units of this many milliseconds (5 seconds). */
export const BILLING_UNIT_MS = 5000;

/**
 * Converts a planned duration into billable 5-second units, or `null` when the duration can't be
 * billed: missing, zero/negative, or not a whole multiple of {@link BILLING_UNIT_MS}. Used both for
 * a device-reported duration and for one looked up from a rotation — either source must satisfy the
 * same rule to be billable.
 */
export function unitsForDurationMs(durationMs: number | null | undefined): number | null {
  if (durationMs === null || durationMs === undefined) return null;
  if (!Number.isInteger(durationMs) || durationMs <= 0) return null;
  if (durationMs % BILLING_UNIT_MS !== 0) return null;
  return durationMs / BILLING_UNIT_MS;
}

/**
 * Charge for a play, in US$ cents: `units * rateCentsAtPlay`. Either input being absent means
 * the play isn't billable (no rate snapshot, or a duration that couldn't be billed), so the charge
 * is 0.
 */
export function centsForPlay(
  units: number | null | undefined,
  rateCentsAtPlay: number | null | undefined
): number {
  if (
    units === null ||
    units === undefined ||
    rateCentsAtPlay === null ||
    rateCentsAtPlay === undefined
  ) {
    return 0;
  }
  return units * rateCentsAtPlay;
}

/** Billable activity for one time window (today, or the last 7 days). */
export interface EarningsWindow {
  /** Number of billable (completed, priced) plays in the window. */
  plays: number;
  /** Sum of billed seconds in the window (billedUnits * 5). */
  billableSeconds: number;
  /** Sum of earnings in the window, in US$ cents. */
  earningsCents: number;
}

/**
 * A screen's pay-per-display earnings summary. `available: false` means the screen has never had
 * a rate, so there is no meaningful "US$ 0" to show — the UI should explain that instead.
 */
export type ScreenEarnings =
  { available: false } | { available: true; today: EarningsWindow; last7Days: EarningsWindow };

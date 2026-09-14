/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ScreenStatusView } from "@proyecta/common";

export const ONLINE_WINDOW_MS = 2 * 60_000;
export const STALE_WINDOW_MS = 10 * 60_000;

/**
 * Derives a screen's live status: UNLINKED without a device; ONLINE with an open event stream or
 * activity in the last 2 minutes; STALE within 10 minutes; OFFLINE otherwise.
 */
export function deriveStatus(input: {
  linked: boolean;
  lastSeenAt: Date | null;
  streamOpen: boolean;
  now: Date;
}): ScreenStatusView {
  if (!input.linked) return "UNLINKED";
  if (input.streamOpen) return "ONLINE";
  if (!input.lastSeenAt) return "OFFLINE";
  const age = input.now.getTime() - input.lastSeenAt.getTime();
  if (age <= ONLINE_WINDOW_MS) return "ONLINE";
  if (age <= STALE_WINDOW_MS) return "STALE";
  return "OFFLINE";
}

/** True when a device counts as "seen" for pairing purposes. */
export function isRecentlySeen(lastSeenAt: Date, streamOpen: boolean, now: Date): boolean {
  return streamOpen || now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}

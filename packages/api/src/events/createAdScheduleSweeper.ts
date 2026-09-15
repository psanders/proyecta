/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { DbClient } from "../db.js";

/**
 * Periodically finds ads that started or ended since the last sweep and pushes updated rotations
 * to their screens, since the passage of time produces no events by itself.
 *
 * @returns A function that runs one sweep (for tests) and a stop function.
 */
export function createAdScheduleSweeper(
  deps: {
    db: Pick<DbClient, "ad">;
    notifyScreens: (screenIds: string[]) => Promise<void>;
    now?: () => Date;
  },
  intervalMs = 60_000
) {
  const now = deps.now ?? (() => new Date());
  let last = now();

  const sweep = async () => {
    const at = now();
    const ads = await deps.db.ad.findMany({
      where: {
        state: "SUBMITTED",
        OR: [{ startsAt: { gt: last, lte: at } }, { endsAt: { gt: last, lte: at } }]
      },
      select: { placements: { select: { screenId: true } } }
    });
    last = at;
    const screenIds = ads.flatMap((ad) => ad.placements.map((p) => p.screenId));
    await deps.notifyScreens(screenIds);
  };

  const timer = setInterval(() => void sweep().catch(() => undefined), intervalMs);
  timer.unref();
  return { sweep, stop: () => clearInterval(timer) };
}

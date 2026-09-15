/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createHash } from "node:crypto";
import {
  effectivePlacement,
  type AssetRenditions,
  type Manifest,
  type ManifestItem
} from "@proyecta/common";
import type { DbClient } from "../../db.js";

export interface RotationScreen {
  id: string;
  name: string;
  resolution: string | null;
}

/** The rotation a screen plays from its approved, in-date ads, or null when it has none. */
export type ScreenRotationLoader = (screen: RotationScreen, now: Date) => Promise<Manifest | null>;

function dimensions(resolution: string | null): { width: number; height: number } {
  const match = /^(\d+)x(\d+)$/.exec(resolution ?? "");
  return match
    ? { width: Number(match[1]), height: Number(match[2]) }
    : { width: 1920, height: 1080 };
}

/**
 * Creates the per-screen rotation loader: for each ad on the screen that isn't cancelled and is
 * within its dates, the most recently approved file (pending and withdrawn placements never play),
 * ordered by ad creation. Item ids are placement ids, so play logs attribute to the exact file.
 *
 * @param db - Injected database client
 */
export function createScreenRotationLoader(
  db: Pick<DbClient, "adPlacement">
): ScreenRotationLoader {
  return async (screen, now) => {
    const rows = await db.adPlacement.findMany({
      where: {
        screenId: screen.id,
        status: "APPROVED",
        asset: { status: "READY" },
        ad: { state: "SUBMITTED", startsAt: { lte: now }, endsAt: { gt: now } }
      },
      include: { ad: true, asset: true }
    });
    const byAd = new Map<string, typeof rows>();
    for (const row of rows) byAd.set(row.adId, [...(byAd.get(row.adId) ?? []), row]);

    const chosen = [...byAd.values()]
      .map((placements) => effectivePlacement(placements)!)
      .sort((a, b) => a.ad.createdAt.getTime() - b.ad.createdAt.getTime());
    if (chosen.length === 0) return null;

    const items: ManifestItem[] = chosen.map((row) => {
      const renditions = (row.asset.renditions ?? {}) as AssetRenditions;
      return {
        id: row.id,
        type: row.asset.kind === "IMAGE" ? "image" : "video",
        advertiser: row.ad.advertiserName,
        title: row.ad.name,
        durationMs: row.asset.durationMs,
        renditions:
          row.asset.kind === "IMAGE"
            ? { webp: renditions.webp }
            : { webm: renditions.webm, mp4: renditions.mp4 }
      };
    });
    const version = createHash("sha256")
      .update(items.map((item) => item.id).join(","))
      .digest("hex")
      .slice(0, 16);
    return {
      version: `screen-${version}`,
      name: "Anuncios",
      screenName: screen.name,
      ...dimensions(screen.resolution),
      items
    };
  };
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/** A resolution as the device protocol writes it, e.g. `1920x1080`. */
export const RESOLUTION_PATTERN = /^\d{2,5}x\d{2,5}$/;

/** Common native panel resolutions, offered in the screen form (custom values are allowed too). */
export const RESOLUTION_PRESETS = ["1280x720", "1920x1080", "2560x1440", "3840x2160"] as const;

/** Quality tiers, by the shorter side of the panel. Labels live in the dashboard's catalogs. */
export const RESOLUTION_TIERS = ["SD", "HD", "FULL_HD", "UHD_4K", "UHD_8K"] as const;
export type ResolutionTier = (typeof RESOLUTION_TIERS)[number];

export interface Resolution {
  width: number;
  height: number;
}

/** Width and height of a `WxH` string, or `null` when it isn't one. */
export function parseResolution(value: string | null | undefined): Resolution | null {
  const text =
    value
      ?.trim()
      .toLowerCase()
      .replace(/\s*[x×]\s*/, "x") ?? "";
  if (!RESOLUTION_PATTERN.test(text)) return null;
  const [width, height] = text.split("x").map(Number) as [number, number];
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * A panel's native resolution with the larger dimension first (`1080x1920` → `1920x1080`), so
 * resolution and orientation can't contradict each other. Anything unparseable is returned trimmed
 * and unchanged, for the schema to reject.
 */
export function normalizeResolution(value: string): string {
  const parsed = parseResolution(value);
  if (!parsed) return value.trim();
  const { width, height } = parsed;
  return width >= height ? `${width}x${height}` : `${height}x${width}`;
}

/** SD / HD / Full HD / 4K / 8K by the shorter side, so portrait and landscape agree. */
export function resolutionTier(value: string | null | undefined): ResolutionTier | null {
  const parsed = parseResolution(value);
  if (!parsed) return null;
  const short = Math.min(parsed.width, parsed.height);
  if (short >= 4320) return "UHD_8K";
  if (short >= 2160) return "UHD_4K";
  if (short >= 1080) return "FULL_HD";
  if (short >= 720) return "HD";
  return "SD";
}

const COMMON_RATIOS: [number, number][] = [
  [16, 9],
  [16, 10],
  [4, 3],
  [5, 4],
  [3, 2],
  [21, 9],
  [32, 9],
  [2, 1],
  [3, 1],
  [1, 1]
];
/** How far (relative) a panel may be from a common ratio and still be named after it. */
const RATIO_TOLERANCE = 0.03;

/**
 * The aspect ratio of a panel as mounted, e.g. `16:9`, or `9:16` when `orientation` is portrait.
 * Near-standard panels snap to the common name (1366x768 → 16:9, 2560x1080 → 21:9); others read
 * as a decimal (`2.40:1`).
 */
export function aspectRatio(
  value: string | null | undefined,
  orientation?: "LANDSCAPE" | "PORTRAIT" | null
): string | null {
  const parsed = parseResolution(value);
  if (!parsed) return null;
  const long = Math.max(parsed.width, parsed.height);
  const short = Math.min(parsed.width, parsed.height);
  const ratio = long / short;
  let best: [number, number] | null = null;
  let bestDistance = Infinity;
  for (const [a, b] of COMMON_RATIOS) {
    const distance = Math.abs(ratio - a / b) / (a / b);
    if (distance <= RATIO_TOLERANCE && distance < bestDistance) {
      best = [a, b];
      bestDistance = distance;
    }
  }
  const [wide, narrow] = best ?? [ratio.toFixed(2), 1];
  return orientation === "PORTRAIT" ? `${narrow}:${wide}` : `${wide}:${narrow}`;
}

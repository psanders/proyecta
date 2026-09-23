/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Reads the downloads store's latest.json (written by scripts/downloads/manifest.mjs at release
 * time), so the download page always offers the newest installers without being redeployed.
 */

export type Platform = "android" | "linux" | "windows";

export interface InstallerFile {
  platform: Platform;
  arch: string;
  name: string;
  /** Absolute download URL. */
  url: string;
  size: number;
}

export interface LatestRelease {
  version: string;
  publishedAt: Date;
  files: InstallerFile[];
}

const PLATFORMS: readonly string[] = ["android", "linux", "windows"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates latest.json and resolves each file's URL against the store root. Returns null for
 * anything malformed, so the page falls back instead of rendering broken links.
 */
export function parseLatestRelease(json: unknown, storeUrl: string): LatestRelease | null {
  if (
    !isRecord(json) ||
    typeof json.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(json.version)
  ) {
    return null;
  }
  const publishedAt = new Date(typeof json.publishedAt === "string" ? json.publishedAt : "");
  if (Number.isNaN(publishedAt.getTime()) || !Array.isArray(json.files)) return null;
  const root = storeUrl.endsWith("/") ? storeUrl : `${storeUrl}/`;
  const files: InstallerFile[] = [];
  for (const file of json.files) {
    if (
      !isRecord(file) ||
      typeof file.platform !== "string" ||
      !PLATFORMS.includes(file.platform) ||
      typeof file.arch !== "string" ||
      typeof file.name !== "string" ||
      typeof file.url !== "string" ||
      typeof file.size !== "number"
    ) {
      return null;
    }
    files.push({
      platform: file.platform as Platform,
      arch: file.arch,
      name: file.name,
      url: new URL(file.url, root).href,
      size: file.size
    });
  }
  return { version: json.version, publishedAt, files };
}

/** latest.json from the store, or null when it can't be read. */
export async function fetchLatestRelease(
  storeUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args)
): Promise<LatestRelease | null> {
  try {
    const dir = storeUrl.endsWith("/") ? storeUrl : `${storeUrl}/`;
    // A relative store (e.g. "/downloads" in previews) resolves against the page.
    const root = typeof location === "undefined" ? dir : new URL(dir, location.href).href;
    const response = await fetchFn(`${root}latest.json`, { cache: "no-cache" });
    return response.ok ? parseLatestRelease(await response.json(), root) : null;
  } catch {
    return null;
  }
}

export function findInstaller(
  release: LatestRelease | null,
  platform: Platform,
  arch?: string
): InstallerFile | undefined {
  return release?.files.find((f) => f.platform === platform && (!arch || f.arch === arch));
}

/** "3 MB", "7.4 MB" (Spanish-style decimals are not needed at this precision). */
export function formatSize(bytes: number): string {
  const mb = bytes / 1_048_576;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${Number(mb.toFixed(1))} MB`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "23 sep 2026", in Santo Domingo time (UTC-4, no DST). */
export function formatReleaseDate(date: Date): string {
  const local = new Date(date.getTime() - 4 * 3_600_000);
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
}

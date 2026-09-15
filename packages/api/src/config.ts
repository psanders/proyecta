/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { resolve } from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

/** Process configuration, read once at startup from the environment. */
export function loadConfig() {
  return {
    port: Number(process.env.PORT ?? 3000),
    isProduction: process.env.NODE_ENV === "production",
    databaseUrl: required("DATABASE_URL"),
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:5175",
    // Default rotation (generated demo ads) served at /media, until advertisers
    // exist. MEDIA_DIR lets deployments mount it elsewhere (e.g. a volume in
    // compose.prod.yaml) instead of the repo-relative dev default.
    mediaDir: process.env.MEDIA_DIR
      ? resolve(process.env.MEDIA_DIR)
      : resolve(import.meta.dirname, "../.data/media"),
    // Advertiser uploads and their renditions, served at /content. Separate from MEDIA_DIR, which
    // the demo generator wipes. Deployments mount a volume here.
    contentDir: process.env.CONTENT_DIR
      ? resolve(process.env.CONTENT_DIR)
      : resolve(import.meta.dirname, "../.data/content"),
    identity: {
      endpoint: required("IDENTITY_ENDPOINT"),
      bridgeUrl: required("IDENTITY_BRIDGE_URL"),
      issuer: process.env.IDENTITY_ISSUER ?? "proyecta",
      audience: process.env.IDENTITY_AUDIENCE ?? "proyecta"
    }
  };
}

export type Config = ReturnType<typeof loadConfig>;

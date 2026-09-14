/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

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
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:5173",
    identity: {
      endpoint: required("IDENTITY_ENDPOINT"),
      bridgeUrl: required("IDENTITY_BRIDGE_URL"),
      issuer: process.env.IDENTITY_ISSUER ?? "proyecta",
      audience: process.env.IDENTITY_AUDIENCE ?? "proyecta"
    }
  };
}

export type Config = ReturnType<typeof loadConfig>;

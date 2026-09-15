/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

/**
 * The database URL from proyecta.json (`PROYECTA_CONFIG`, else `config/proyecta.json` at the
 * repository root). `DATABASE_URL` overrides it for tooling only: a placeholder for
 * `prisma generate` in CI and Docker builds, or pointing `migrate deploy` at the test database.
 * Read directly rather than through src/config.ts, which isn't in the runtime image.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const path =
    process.env.PROYECTA_CONFIG ??
    fileURLToPath(new URL("../../config/proyecta.json", import.meta.url));
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path} (copy config/proyecta.example.json)`);
  }
  const url = (JSON.parse(readFileSync(path, "utf8")) as { database?: { url?: string } }).database
    ?.url;
  if (!url) throw new Error(`database.url is missing in ${path}`);
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: databaseUrl() }
});

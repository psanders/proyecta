/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod/v4";

/** `config/proyecta.json` at the repository root (the same from `src/` and `dist/`). */
export const DEFAULT_CONFIG_PATH = resolve(import.meta.dirname, "../../../config/proyecta.json");
const DEFAULT_MEDIA_DIR = resolve(import.meta.dirname, "../.data/media");
const DEFAULT_CONTENT_DIR = resolve(import.meta.dirname, "../.data/content");

const url = z.string().trim().min(1);

const configSchema = z.object({
  server: z
    .object({ port: z.number().int().min(1).max(65_535).default(3000) })
    .default({ port: 3000 }),
  database: z.object({ url }),
  dashboard: z.object({ url }),
  identity: z.object({
    endpoint: url,
    bridgeUrl: url,
    // Identity's defaults. Set only if identity.json uses different values; they must match.
    issuer: z.string().min(1).default("proyecta"),
    audience: z.string().min(1).default("proyecta")
  }),
  // Default rotation (generated demo ads) served at /media until advertisers exist.
  media: z.object({ dir: z.string().min(1).optional() }).default({}),
  // Advertiser uploads and their renditions, served at /content. Separate from media.dir, which
  // the demo generator wipes. Deployments mount a volume at the default.
  content: z.object({ dir: z.string().min(1).optional() }).default({}),
  // Local integration tests only; never set in production.
  test: z.object({ databaseUrl: url.optional(), mailpitUrl: url.optional() }).default({})
});

export type ProyectaConfigFile = z.infer<typeof configSchema>;

/**
 * Process configuration, read once at startup from `proyecta.json`: `PROYECTA_CONFIG` when set,
 * else `config/proyecta.json` at the repository root. Throws a message naming the file and every
 * invalid field. `NODE_ENV` stays an environment variable, as libraries expect.
 */
export function loadConfig(path = process.env.PROYECTA_CONFIG ?? DEFAULT_CONFIG_PATH) {
  if (!existsSync(path)) {
    throw new Error(
      `Config file not found: ${path} (npm run db:up writes a local one; production starts from config/proyecta.example.json)`
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`Config file ${path} is not valid JSON: ${(err as Error).message}`, {
      cause: err
    });
  }
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid config file ${path}:\n  ${fields.join("\n  ")}`);
  }
  const file = parsed.data;
  return {
    port: file.server.port,
    isProduction: process.env.NODE_ENV === "production",
    databaseUrl: file.database.url,
    dashboardUrl: file.dashboard.url,
    mediaDir: file.media.dir ? resolve(file.media.dir) : DEFAULT_MEDIA_DIR,
    contentDir: file.content.dir ? resolve(file.content.dir) : DEFAULT_CONTENT_DIR,
    identity: file.identity,
    test: file.test
  };
}

export type Config = ReturnType<typeof loadConfig>;

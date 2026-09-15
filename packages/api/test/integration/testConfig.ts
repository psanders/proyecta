/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { loadConfig } from "../../src/config.js";

/** Integration-test settings from the `test` section of config/proyecta.json. */
export function testConfig() {
  const { test } = loadConfig();
  if (!test.databaseUrl) {
    throw new Error(
      "test.databaseUrl is not set in config/proyecta.json (npm run db:up writes it)"
    );
  }
  return { databaseUrl: test.databaseUrl, mailpitUrl: test.mailpitUrl ?? "http://localhost:8026" };
}

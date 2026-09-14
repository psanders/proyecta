/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
  webServer: [
    {
      command: "npm run dev:player",
      url: "http://localhost:5174",
      reuseExistingServer: true
    }
  ]
});

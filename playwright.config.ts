/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  // The dashboard picks English for English browsers on a first visit; the suites expect Spanish.
  use: { trace: "on-first-retry", locale: "es-DO" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://localhost:3000/healthz",
      reuseExistingServer: true
    },
    {
      command: "npm run dev:dashboard",
      url: "http://localhost:5175",
      reuseExistingServer: true
    },
    {
      command: "npm run dev:player",
      url: "http://localhost:5174",
      reuseExistingServer: true
    },
    {
      command: "npm run dev:web",
      url: "http://localhost:5176",
      reuseExistingServer: true
    }
  ]
});

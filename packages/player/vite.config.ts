/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { defineConfig } from "vite";

// Chromium 108 is the provisional floor (Tizen 2024, OPFS sync access); the device spike confirms it.
export default defineConfig({
  resolve: { conditions: ["source"] },
  build: { target: "chrome108" },
  server: {
    port: 5174,
    proxy: { "/device": "http://localhost:3000", "/dev": "http://localhost:3000" }
  }
});

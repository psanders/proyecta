/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

/**
 * Oldest Chromium/WebView the player supports. A working value until the device spike measures
 * the boxes valleros actually have (player-shells task 1.2); the Android shell's
 * `MIN_WEBVIEW_MAJOR` must match it.
 */
const MIN_CHROMIUM = 69;

export default defineConfig({
  resolve: { conditions: ["source"] },
  // Syntax is lowered and missing APIs are polyfilled (core-js, by usage) for MIN_CHROMIUM.
  plugins: [
    legacy({
      modernTargets: [`chrome >= ${MIN_CHROMIUM}`],
      modernPolyfills: true,
      renderLegacyChunks: false
    })
  ],
  build: {
    cssTarget: `chrome${MIN_CHROMIUM}`,
    // unsupported.html is what the Android shell shows on a WebView older than MIN_CHROMIUM.
    rollupOptions: { input: { main: "index.html", unsupported: "unsupported.html" } }
  },
  server: {
    port: 5174,
    proxy: {
      "/device": "http://localhost:3000",
      "/media": "http://localhost:3000",
      "/content": "http://localhost:3000"
    }
  }
});

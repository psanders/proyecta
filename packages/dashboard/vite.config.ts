/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { conditions: ["source"] },
  server: { port: 5173, proxy: { "/trpc": "http://localhost:3000" } }
});

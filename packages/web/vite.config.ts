/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  server: { port: 5176, strictPort: true }
});

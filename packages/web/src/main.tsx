/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";
import { initMetaPixel } from "./lib/metaPixel.js";

initMetaPixel();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

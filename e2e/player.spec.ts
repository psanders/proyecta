/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect, test } from "@playwright/test";

test("player shows a branded 8-character pairing code", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("http://localhost:5174/");
  await expect(page.getByText(/\b[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}\b/)).toBeVisible();
  await expect(page.getByText("Esperando conexión...")).toBeVisible();
});

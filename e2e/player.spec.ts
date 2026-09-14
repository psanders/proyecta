/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect, test } from "@playwright/test";

const PLAYER = "http://localhost:5174/";

test.describe("player demo rotation", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("rotates images and videos with the operator overlay", async ({ page }) => {
    await page.goto(`${PLAYER}?debug=1&slotMs=1500`);
    await expect(page.getByText("REPRODUCIENDO")).toBeVisible();
    await expect(page.getByText(/Rotación General · anuncio \d de 6/)).toBeVisible();

    await page.waitForFunction(() => window.__proyecta.plays.length >= 4, undefined, {
      timeout: 30_000
    });
    const plays = await page.evaluate(() => window.__proyecta.plays);

    expect(plays.every((play) => play.result === "completed")).toBe(true);
    expect(plays.map((play) => play.itemId).slice(0, 4)).toEqual([
      "cafe-aroma",
      "cerveceria-caribe",
      "farmacia-luz",
      "motores-quisqueya"
    ]);
    expect(plays.some((play) => play.codec === "webp")).toBe(true);
    expect(plays.some((play) => play.codec === "vp9" || play.codec === "h264")).toBe(true);
  });

  test("shows the branded pairing screen when there is no rotation", async ({ page }) => {
    await page.route("**/dev/manifest", (route) => route.fulfill({ status: 404, body: "{}" }));
    await page.goto(PLAYER);
    await expect(page.getByRole("heading", { name: "Vincula esta pantalla" })).toBeVisible();
    await expect(page.getByText("8F3K-2QLM")).toBeVisible();
    await expect(page.getByText("Esperando conexión...")).toBeVisible();
  });
});

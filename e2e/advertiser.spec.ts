/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Advertiser golden path against the local stack (npm run db:up; ffmpeg on PATH): a business that
 * both owns screens and advertises uploads a file, puts an ad on its own screen and sees the player
 * receive it; then it switches the dashboard view to Anunciar.
 * Set SCREENSHOTS_DIR to save page screenshots for design review.
 */
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const APP = "http://localhost:5175";
const PLAYER = "http://localhost:5174";
const shots = process.env.SCREENSHOTS_DIR;

async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

test.describe("advertiser ads", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(120_000);

  test("sign up as both, advertise on an own screen, see it on the player and switch the view", async ({
    page,
    context
  }, testInfo) => {
    const stamp = Date.now();
    const screenName = `Farmacia Luz ${stamp}`;
    const image = testInfo.outputPath("promo-desayuno.png");
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xEC5E2B:s=1920x1080",
      "-frames:v",
      "1",
      image
    ]);

    const player = await context.newPage();
    await player.setViewportSize({ width: 1280, height: 720 });
    await player.goto(`${PLAYER}/?hw=e2e-advertiser-${stamp}&slotMs=1500`);
    await expect(player.locator(".code-box")).toHaveText(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    const code = (await player.locator(".code-box").textContent())!.trim();

    // Sign up and choose "Ambos" on the welcome step.
    await page.goto(`${APP}/sign-up`);
    await page.getByLabel("Tu nombre").fill("Ana Peralta");
    await page.getByLabel("Nombre del negocio").fill("Farmacia Luz");
    await page.getByLabel("Correo electrónico").fill(`both-${stamp}@proyecta.local`);
    await page.getByLabel("Contraseña").fill("supersecreta1");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(
      page.getByRole("heading", { name: "¿Qué quieres hacer con Proyecta?" })
    ).toBeVisible();
    await page.getByRole("radio", { name: /Ambos/ }).click();
    await shot(page, "a1-welcome-view");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Pair the player and publish a complete screen.
    await page.getByLabel("Ingresa el código de vinculación").fill(code);
    await page.getByRole("button", { name: "Vincular y continuar" }).click();
    await page.getByLabel("Nombre de la pantalla").fill(screenName);
    await page.getByLabel("Ciudad").fill("Santo Domingo");
    await page.getByLabel("Coordenadas").fill("18.4719, -69.9406");
    for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"])
      await page.getByRole("button", { name: day, exact: true }).click();
    await page.getByLabel("Hora de inicio").fill("00:00");
    await page.getByLabel("Hora de fin").fill("23:59");
    await page.getByLabel("Tarifa por 5 segundos (US$)").fill("0.90");
    await page.getByRole("button", { name: "Guardar y publicar pantalla" }).click();
    await expect(page.getByRole("heading", { name: screenName })).toBeVisible();

    // Both sides show as labeled groups in the menu.
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("group", { name: "Pantallas" })).toBeVisible();
    await expect(nav.getByRole("group", { name: "Anuncios" })).toBeVisible();

    // The catalog lists the own screen as free.
    await nav.getByRole("link", { name: "Buscar pantallas" }).click();
    await expect(page.getByRole("heading", { name: "Buscar pantallas" })).toBeVisible();
    await expect(page.getByText(screenName)).toBeVisible();
    await expect(page.getByText("Tuya · sin costo").first()).toBeVisible();
    await shot(page, "a2-explore");

    // Upload an image for 10 seconds and wait until it's prepared.
    await nav.getByRole("link", { name: "Recursos" }).click();
    await page.getByTestId("asset-file-input").setInputFiles(image);
    const upload = page.getByRole("dialog");
    await expect(upload.getByLabel("Nombre")).toHaveValue("promo-desayuno");
    await upload.getByLabel("Nombre").fill("Promo Desayuno");
    await upload.getByLabel("Duración en pantalla").selectOption("10000");
    await upload.getByRole("button", { name: "Subir" }).click();
    await expect(page.getByText("Promo Desayuno", { exact: true })).toBeVisible();
    await expect(page.getByText("Listo")).toBeVisible({ timeout: 30_000 });
    await shot(page, "a3-assets");

    // Create the ad on the own screen, starting today.
    await nav.getByRole("link", { name: "Anuncios" }).click();
    await page.getByRole("button", { name: "Crear anuncio" }).first().click();
    await page.getByRole("radio", { name: /Promo Desayuno/ }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("checkbox", { name: new RegExp(screenName) }).check();
    await shot(page, "a4-ad-screens");
    await page.getByRole("button", { name: "Continuar · 1 pantalla" }).click();
    await expect(page.getByLabel("Nombre del anuncio")).toHaveValue("Promo Desayuno");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByText("Sale al aire en sus fechas")).toBeVisible();
    await shot(page, "a5-ad-review");
    await page.getByRole("button", { name: "Crear anuncio" }).click();

    await expect(page.getByRole("heading", { name: "Promo Desayuno" })).toBeVisible();
    await expect(page.getByTestId("ad-screen-row")).toContainText("Al aire");
    await shot(page, "a6-ad-detail");

    // The player switches from the default rotation to the screen's own ads.
    await expect
      .poll(() => player.evaluate(() => window.__proyecta.manifestVersion ?? ""), {
        timeout: 20_000
      })
      .toMatch(/^screen-/);

    // Switch the view to Anunciar: the confirmation says the screen keeps running.
    await page.getByRole("navigation").getByRole("link", { name: "Configuración" }).click();
    await page.getByRole("radio", { name: /Anunciar/ }).click();
    await page.getByRole("button", { name: "Guardar vista" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText(
      "Tus pantallas vinculadas (1) siguen activas y facturando."
    );
    await shot(page, "a7-view-confirm");
    await confirm.getByRole("button", { name: "Cambiar vista" }).click();
    const menu = page.getByRole("navigation");
    await expect(menu.getByRole("link", { name: "Pantallas", exact: true })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Anuncios", exact: true })).toBeVisible();
    await page.goto(APP);
    await expect(page).toHaveURL(`${APP}/ads`);
    await expect(page.getByRole("heading", { name: "Anuncios", exact: true })).toBeVisible();
  });
});

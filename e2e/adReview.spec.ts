/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Owner review against the local stack (npm run db:up; ffmpeg on PATH): an advertiser business puts
 * an ad on another business's screen; the owner sees the request count, approves it, the owner's
 * player receives the ad, then the owner stops it and the advertiser sees why.
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

async function signUp(page: Page, business: string, email: string, view: RegExp) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Ana Peralta");
  await page.getByLabel("Nombre del negocio").fill(business);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("supersecreta1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Qué quieres hacer con Proyecta?" })
  ).toBeVisible();
  await page.getByRole("radio", { name: view }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
}

test.describe("ad review", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(150_000);

  test("an owner approves another business's ad, the player plays it, then the owner stops it", async ({
    browser
  }, testInfo) => {
    const stamp = Date.now();
    const screenName = `Gimnasio Norte ${stamp}`;
    const image = testInfo.outputPath("promo.png");
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x2B6CEC:s=1920x1080",
      "-frames:v",
      "1",
      image
    ]);

    // Owner business: pair a player and publish a complete screen.
    const ownerContext = await browser.newContext({ locale: "es-DO" });
    const owner = await ownerContext.newPage();
    const player = await ownerContext.newPage();
    await player.setViewportSize({ width: 1280, height: 720 });
    await player.goto(`${PLAYER}/?hw=e2e-review-${stamp}&slotMs=1500`);
    await expect(player.locator(".code-box")).toHaveText(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    const code = (await player.locator(".code-box").textContent())!.trim();

    await signUp(
      owner,
      "Gimnasios del Norte",
      `owner-review-${stamp}@proyecta.local`,
      /Publicar pantallas/
    );
    await owner.getByLabel("Ingresa el código de vinculación").fill(code);
    await owner.getByRole("button", { name: "Vincular y continuar" }).click();
    await owner.getByLabel("Nombre de la pantalla").fill(screenName);
    await owner.getByLabel("Ciudad").fill("Santiago");
    for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"])
      await owner.getByRole("button", { name: day, exact: true }).click();
    await owner.getByLabel("Hora de inicio").fill("00:00");
    await owner.getByLabel("Hora de fin").fill("23:59");
    await owner.getByLabel("Tarifa por 5 segundos (US$)").fill("0.75");
    await owner.getByRole("button", { name: "Guardar y publicar pantalla" }).click();
    await expect(owner.getByRole("heading", { name: screenName })).toBeVisible();

    // Advertiser business: upload an image and create an ad on the owner's screen.
    const advertiserContext = await browser.newContext({ locale: "es-DO" });
    const advertiser = await advertiserContext.newPage();
    await signUp(advertiser, "Café Aroma", `adv-review-${stamp}@proyecta.local`, /Anunciar/);
    await expect(advertiser.getByRole("heading", { name: "Buscar pantallas" })).toBeVisible();
    await advertiser.getByRole("navigation").getByRole("link", { name: "Recursos" }).click();
    await advertiser.getByTestId("asset-file-input").setInputFiles(image);
    await advertiser.getByRole("dialog").getByRole("button", { name: "Subir" }).click();
    await expect(advertiser.getByText("Listo")).toBeVisible({ timeout: 30_000 });
    await advertiser.goto(`${APP}/ads/new`);
    await advertiser.getByRole("radio", { name: /promo/ }).click();
    await advertiser.getByRole("button", { name: "Continuar", exact: true }).click();
    await advertiser.getByRole("checkbox", { name: new RegExp(screenName) }).check();
    await advertiser.getByRole("button", { name: "Continuar · 1 pantalla" }).click();
    await advertiser.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(advertiser.getByText("Esperando aprobación del dueño")).toBeVisible();
    await advertiser.getByRole("button", { name: "Crear anuncio" }).click();
    await expect(advertiser.getByTestId("ad-screen-row")).toContainText("Esperando aprobación");
    const adUrl = advertiser.url();

    // The owner sees one pending request and approves it.
    await owner.goto(`${APP}/requests`);
    await expect(owner.getByTestId("requests-count")).toHaveText("1", { timeout: 35_000 });
    await expect(owner.getByText("Café Aroma", { exact: false }).first()).toBeVisible();
    await shot(owner, "r1-requests");
    await owner.getByRole("link", { name: /promo/ }).first().click();
    await expect(owner.getByRole("checkbox", { name: screenName })).toBeChecked();
    await shot(owner, "r2-review");
    await owner.getByRole("button", { name: "Aprobar en 1 pantalla" }).click();
    await expect(owner.getByTestId("request-screen")).toContainText("Al aire");
    await expect(owner.getByTestId("requests-count")).toHaveCount(0);

    // The owner's player switches to the screen's own rotation; the advertiser sees Al aire.
    await expect
      .poll(() => player.evaluate(() => window.__proyecta.manifestVersion ?? ""), {
        timeout: 20_000
      })
      .toMatch(/^screen-/);
    await advertiser.goto(adUrl);
    await expect(advertiser.getByTestId("ad-screen-row")).toContainText("Al aire");

    // The owner stops it from the screen detail with a note.
    await owner.goto(`${APP}/`);
    await owner.getByTestId("screen-row").filter({ hasText: screenName }).click();
    const card = owner.getByTestId("screen-ad");
    await expect(card).toContainText("Al aire");
    await card.getByRole("button", { name: "Detener" }).click();
    const dialog = owner.getByRole("dialog");
    await dialog.getByLabel("Nota para el anunciante (opcional)").fill("Cambio de programación");
    await shot(owner, "r3-stop");
    await dialog.getByRole("button", { name: "Detener" }).click();
    await expect(
      owner.getByText("Ningún otro negocio tiene anuncios en esta pantalla.")
    ).toBeVisible();

    await advertiser.reload();
    await expect(advertiser.getByTestId("ad-screen-row")).toContainText("Detenido por el vallero");
    await expect(advertiser.getByTestId("screen-reason")).toHaveText("«Cambio de programación»");
    await expect(advertiser.getByText("Requiere atención")).toBeVisible();
    await shot(advertiser, "r4-advertiser-stopped");

    await ownerContext.close();
    await advertiserContext.close();
  });
});

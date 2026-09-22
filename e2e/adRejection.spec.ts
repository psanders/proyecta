/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * The other half of ad review against the local stack (npm run db:up; ffmpeg on PATH): an owner
 * turns a request down. adReview.spec.ts covers approval and stopping an ad that is already on air;
 * this spec covers rejection, and checks the advertiser is told why.
 */
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const APP = "http://localhost:5175";

async function signUp(page: Page, business: string, email: string, view: RegExp) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Ana Peralta");
  await page.getByLabel("Nombre del negocio").fill(business);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("supersecreta1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("radio", { name: view }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
}

test.describe("ad rejection", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(150_000);

  test("an owner rejects another business's ad and the advertiser sees the reason", async ({
    browser
  }, testInfo) => {
    const stamp = Date.now();
    const screenName = `Plaza Central ${stamp}`;
    const image = testInfo.outputPath("rechazo.png");
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xE23D2B:s=1920x1080",
      "-frames:v",
      "1",
      image
    ]);

    // Owner business: publish a complete screen (no player needed — nothing will go on air).
    const ownerContext = await browser.newContext({ locale: "es-DO" });
    const owner = await ownerContext.newPage();
    await signUp(
      owner,
      "Vallas del Cibao",
      `owner-reject-${stamp}@proyecta.local`,
      /Publicar pantallas/
    );
    await owner.goto(`${APP}/screens/new`);
    await owner.getByLabel("Nombre de la pantalla").fill(screenName);
    await owner.getByLabel("Ciudad").fill("La Vega");
    for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"])
      await owner.getByRole("button", { name: day, exact: true }).click();
    await owner.getByLabel("Hora de inicio").fill("00:00");
    await owner.getByLabel("Hora de fin").fill("23:59");
    await owner.getByLabel("Tarifa por 5 segundos (US$)").fill("1.00");
    await owner.getByRole("button", { name: "Guardar y publicar pantalla" }).click();
    await expect(owner.getByRole("heading", { name: screenName })).toBeVisible();

    // Advertiser business: request the screen.
    const advertiserContext = await browser.newContext({ locale: "es-DO" });
    const advertiser = await advertiserContext.newPage();
    await signUp(advertiser, "Bebidas del Sur", `adv-reject-${stamp}@proyecta.local`, /Anunciar/);
    await advertiser.getByRole("navigation").getByRole("link", { name: "Recursos" }).click();
    await advertiser.getByTestId("asset-file-input").setInputFiles(image);
    await advertiser.getByRole("dialog").getByRole("button", { name: "Subir" }).click();
    await expect(advertiser.getByText("Listo")).toBeVisible({ timeout: 30_000 });
    await advertiser.goto(`${APP}/ads/new`);
    await advertiser.getByRole("radio", { name: /rechazo/ }).click();
    await advertiser.getByRole("button", { name: "Continuar", exact: true }).click();
    await advertiser.getByRole("checkbox", { name: new RegExp(screenName) }).check();
    await advertiser.getByRole("button", { name: "Continuar · 1 pantalla" }).click();
    await advertiser.getByRole("button", { name: "Continuar", exact: true }).click();
    await advertiser.getByRole("button", { name: "Crear anuncio" }).click();
    await expect(advertiser.getByTestId("ad-screen-row")).toContainText("Esperando aprobación");
    const adUrl = advertiser.url();

    // The owner rejects it with a reason and a note.
    await owner.goto(`${APP}/requests`);
    await expect(owner.getByTestId("requests-count")).toHaveText("1", { timeout: 35_000 });
    await owner
      .getByRole("link", { name: /rechazo/ })
      .first()
      .click();
    await owner.getByRole("button", { name: "Rechazar" }).click();
    const dialog = owner.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Es de la competencia" }).check();
    await dialog.getByLabel(/Nota para el anunciante/).fill("Ya tenemos una marca de bebidas.");
    await dialog.getByRole("button", { name: "Rechazar" }).click();

    // The request leaves the pending inbox.
    await expect(owner.getByTestId("requests-count")).toHaveCount(0);

    // The advertiser sees the rejection and why.
    await advertiser.goto(adUrl);
    await expect(advertiser.getByTestId("ad-screen-row")).toContainText("Rechazado");
    await expect(advertiser.getByTestId("screen-reason")).toContainText(
      "Ya tenemos una marca de bebidas."
    );

    await ownerContext.close();
    await advertiserContext.close();
  });
});

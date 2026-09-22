/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * The session lifecycle against the local stack (npm run db:up): signing in with the right and the
 * wrong password, reaching a protected page only while signed in, and signing out.
 *
 * Sign-up is covered by dashboard.spec.ts; this spec starts from an account that already exists,
 * which is the path a returning owner actually takes.
 */
import { expect, test, type Page } from "@playwright/test";

const APP = "http://localhost:5175";
const PASSWORD = "supersecreta1";

async function signUp(page: Page, business: string, email: string) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Rosa Almonte");
  await page.getByLabel("Nombre del negocio").fill(business);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Qué quieres hacer con Proyecta?" })
  ).toBeVisible();
  await page.getByRole("radio", { name: /Publicar pantallas/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${APP}/sign-in`);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test.describe("session", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("signs in, rejects a wrong password, and signs out again", async ({ page }) => {
    const stamp = Date.now();
    const email = `session-${stamp}@proyecta.local`;

    // Create the account, then drop the session so the next visit starts signed out. Sign-up lands
    // on onboarding, which has no sidebar, so step into the app shell for the account menu.
    await signUp(page, "Vallas del Este", email);
    await page.goto(`${APP}/`);
    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();

    // A wrong password is refused, and the session stays empty.
    await signIn(page, email, "contrasenaincorrecta");
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
    await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("proyecta.dashboard.session"))
    ).toBeNull();

    // An unknown account is refused the same way, so neither answer reveals who has an account.
    await signIn(page, `nobody-${stamp}@proyecta.local`, PASSWORD);
    await expect(page.getByText("Correo o contraseña incorrectos")).toBeVisible();

    // The right password gets in.
    await signIn(page, email, PASSWORD);
    await expect(page.getByRole("button", { name: "Negocio y cuenta" })).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("proyecta.dashboard.session"))
    ).not.toBeNull();

    // Signing out clears the stored session and sends a protected page back to sign-in.
    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("proyecta.dashboard.session"))
    ).toBeNull();

    await page.goto(`${APP}/team`);
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  });
});

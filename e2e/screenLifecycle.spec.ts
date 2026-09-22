/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Screen editing and deletion against the local stack (npm run db:up). Creating, archiving and
 * unlinking are covered by dashboard.spec.ts; this spec fills in the two lifecycle steps it
 * doesn't reach — changing a saved screen, and deleting one for good.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000/trpc";

const APP = "http://localhost:5175";

async function signUp(page: Page, email: string) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Rosa Almonte");
  await page.getByLabel("Nombre del negocio").fill("Vallas del Sur");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("supersecreta1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("radio", { name: /Publicar pantallas/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Fills the add-screen form with a complete screen, so nothing is left incomplete. */
async function addScreen(page: Page, name: string) {
  await page.goto(`${APP}/screens/new`);
  await page.getByLabel("Nombre de la pantalla").fill(name);
  await page.getByLabel("Ciudad").fill("Santo Domingo");
  for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie"])
    await page.getByRole("button", { name: day, exact: true }).click();
  await page.getByLabel("Hora de inicio").fill("08:00");
  await page.getByLabel("Hora de fin").fill("22:00");
  await page.getByLabel("Tarifa por 5 segundos (US$)").fill("1.25");
  await page.getByRole("button", { name: "Guardar y publicar pantalla" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test.describe("screen lifecycle", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test("edits a saved screen and then deletes it", async ({ page, request }) => {
    const stamp = Date.now();
    const name = `Valla Sur ${stamp}`;
    const renamed = `Valla Sur Renovada ${stamp}`;

    await signUp(page, `screens-${stamp}@proyecta.local`);
    await addScreen(page, name);

    // Edit: rename, move city, and raise the rate.
    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Nombre de la pantalla").fill(renamed);
    await page.getByLabel("Ciudad").fill("Santiago");
    await page.getByLabel("Tarifa por 5 segundos (US$)").fill("3.00");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByRole("heading", { name: renamed })).toBeVisible();
    await expect(page.getByText("Santiago")).toBeVisible();
    await expect(page.getByText("US$ 3.00")).toBeVisible();

    // The change survives a reload, so it was persisted rather than only held in the form.
    await page.reload();
    await expect(page.getByRole("heading", { name: renamed })).toBeVisible();
    await expect(page.getByText("US$ 3.00")).toBeVisible();

    // Delete: the screen disappears from the list entirely, unlike archiving.
    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "¿Eliminar esta pantalla?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(page.getByRole("heading", { name: "Aún no tienes pantallas" })).toBeVisible();

    // Deleted, not archived — so it is absent from the archived list as well. Asserted through the
    // API rather than the Archivadas tab: with no active screens the list short-circuits to the
    // empty state and never renders the tabs (see FINDINGS.md).
    const session = JSON.parse(
      (await page.evaluate(() => localStorage.getItem("proyecta.dashboard.session")))!
    ) as { accessToken: string; workspace: string };
    const archived = await request.get(
      `${API}/screens.list?input=${encodeURIComponent(JSON.stringify({ archived: true }))}`,
      {
        headers: {
          authorization: `Bearer ${session.accessToken}`,
          "x-workspace": session.workspace
        }
      }
    );
    const body = (await archived.json()) as { result: { data: { screens: { name: string }[] } } };
    expect(body.result.data.screens.map((s) => s.name)).not.toContain(renamed);
  });
});

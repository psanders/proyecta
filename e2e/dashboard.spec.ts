/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Owner dashboard golden paths against the local stack (npm run db:up + demo media).
 * Set SCREENSHOTS_DIR to save page screenshots for design review.
 */
import { expect, test, type Page } from "@playwright/test";

const APP = "http://localhost:5175";
const PLAYER = "http://localhost:5174";
const MAILPIT = "http://localhost:8026";
const shots = process.env.SCREENSHOTS_DIR;

async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

async function signUp(page: Page, stamp: number, email = `owner-${stamp}@proyecta.local`) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Rosa Almonte");
  await page.getByLabel("Nombre del negocio").fill("Vallas del Cibao");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("supersecreta1");
  await shot(page, "01-sign-up");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // Welcome step: the dashboard view, left on "Publicar pantallas".
  await expect(
    page.getByRole("heading", { name: "¿Qué quieres hacer con Proyecta?" })
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /Publicar pantallas/ })).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Publiquemos tu primera pantalla" })
  ).toBeVisible();
}

test.describe("owner dashboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test("sign up, pair the player during onboarding, see it on air, unlink and archive", async ({
    page,
    context
  }) => {
    const stamp = Date.now();
    const player = await context.newPage();
    await player.setViewportSize({ width: 1280, height: 720 });
    await player.goto(`${PLAYER}/?hw=e2e-dashboard-${stamp}&slotMs=1500`);
    await expect(player.locator(".code-box")).toHaveText(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    await expect(player.getByText("Esperando conexión...")).toBeVisible();
    const code = (await player.locator(".code-box").textContent())!.trim();

    await page.goto(`${APP}/sign-in`);
    await shot(page, "00-sign-in");
    await signUp(page, stamp);
    await page.getByLabel("Ingresa el código de vinculación").fill(code.toLowerCase());
    await expect(page.getByText("Pantalla encontrada · lista para vincular")).toBeVisible();
    await shot(page, "02-onboarding-found");
    await page.getByRole("button", { name: "Vincular y continuar" }).click();

    await expect(page.getByRole("heading", { name: "Agregar pantalla" })).toBeVisible();
    await page.getByLabel("Nombre de la pantalla").fill("Valla Av. 27 de Febrero");
    await page.getByLabel("Ciudad").fill("Santo Domingo");
    await page.getByLabel("Tipo de lugar").selectOption("BILLBOARD");
    for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie"])
      await page.getByRole("button", { name: day, exact: true }).click();
    await page.getByLabel("Hora de inicio").fill("08:00");
    await page.getByLabel("Hora de fin").fill("22:00");
    await page.getByLabel("Tarifa por 5 segundos (US$)").fill("2.50");
    await shot(page, "03-add-screen");
    await page.getByRole("button", { name: "Guardar y publicar pantalla" }).click();

    await expect(page.getByRole("heading", { name: "Valla Av. 27 de Febrero" })).toBeVisible();
    await expect(page.getByTestId("status-badge").first()).toHaveText("En línea");
    await expect(page.getByTestId("pairing-code")).toHaveText(code);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copiar código" }).click();
    await expect(page.getByRole("button", { name: "Código copiado" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await expect(player.locator(".code-box")).toBeHidden();
    // Pay-per-display: the rate saved above, and an earnings summary instead of "Próximamente".
    await expect(page.getByText("US$ 2.50")).toBeVisible();
    await expect(page.getByText(/^Hoy · \d+ reproducci/)).toBeVisible();
    await expect(page.getByText(/^Últimos 7 días · \d+ reproducci/)).toBeVisible();
    await shot(page, "04-screen-detail-linked");

    await page.getByRole("link", { name: "Volver a Mis pantallas" }).click();
    await expect(page.getByTestId("screen-row")).toHaveCount(1);
    await expect(page.getByTestId("screen-row")).toContainText("Lun–Vie · 8:00–22:00");
    await shot(page, "05-screens");

    await page.getByTestId("screen-row").click();
    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Desvincular reproductor" }).click();
    await shot(page, "06-unlink-dialog");
    await page.getByRole("dialog").getByRole("button", { name: "Desvincular" }).click();
    await expect(page.getByText("Esta pantalla no tiene un reproductor vinculado.")).toBeVisible();
    await expect(player.locator(".code-box")).toHaveText(code);

    await page.getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Archivar" }).click();
    await shot(page, "07-archive-dialog");
    await page.getByRole("dialog").getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByRole("heading", { name: "Aún no tienes pantallas" })).toBeVisible();
    await shot(page, "08-screens-empty");
  });

  test("collapses the navigation to an icon rail and remembers it", async ({ page }) => {
    await signUp(page, Date.now());
    await page.goto(APP);
    const nav = page.locator("aside");
    await expect(nav).toHaveAttribute("data-collapsed", "false");
    await expect(page.getByRole("heading", { name: "Aún no tienes pantallas" })).toBeVisible();
    await shot(page, "11-nav-expanded");

    await page.getByRole("button", { name: "Contraer menú" }).click();
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await expect(page.getByRole("link", { name: "Configuración" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Expandir menú" })).toBeVisible();
    await expect.poll(async () => (await nav.boundingBox())?.width).toBe(72);
    await expect(page.getByRole("button", { name: "Negocio y cuenta" })).toHaveText("VC");
    await shot(page, "12-nav-collapsed");

    await page.reload();
    await expect(nav).toHaveAttribute("data-collapsed", "true");
    await page.getByRole("button", { name: "Expandir menú" }).click();
    await expect(nav).toHaveAttribute("data-collapsed", "false");
  });

  test("switches the theme from Mi perfil and remembers it", async ({ page }) => {
    const html = page.locator("html");
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "dark" });
    await signUp(page, Date.now());
    await page.goto(APP);
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await background()).toBe("rgb(242, 243, 240)");

    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Mi perfil" }).click();
    const appearance = page.getByRole("radiogroup", { name: "Apariencia" });
    await expect(appearance.getByRole("radio", { name: "Sistema" })).toBeChecked();
    await appearance.getByRole("radio", { name: "Oscuro" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(appearance.getByRole("radio", { name: "Oscuro" })).toBeChecked();
    expect(await background()).toBe("rgb(17, 17, 17)");
    await shot(page, "13-theme-dark");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(appearance.getByRole("radio", { name: "Oscuro" })).toBeChecked();

    await appearance.getByRole("radio", { name: "Claro" }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("switches to English in Mi perfil, keeps it on other browsers and localizes API errors", async ({
    page,
    browser
  }) => {
    const stamp = Date.now();
    const email = `english-${stamp}@proyecta.local`;
    const html = page.locator("html");
    await signUp(page, stamp, email);
    await page.goto(APP);
    await expect(html).toHaveAttribute("lang", "es-DO");

    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await page.getByRole("menuitem", { name: "Mi perfil" }).click();
    await expect(page.getByLabel("Idioma")).toHaveValue("es");
    await page.getByLabel("Idioma").selectOption("en");

    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Appearance" })).toBeVisible();
    await expect(html).toHaveAttribute("lang", "en-US");
    await shot(page, "17-profile-english");

    // API messages follow the language: a field error and a domain error.
    await page.getByLabel("Current password").fill("wrong-password");
    await page.getByLabel("New password").fill("short");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    await page.getByLabel("New password").fill("otra-supersecreta");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Your current password is incorrect")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();

    // Another browser that never opened Proyecta: Spanish until the saved language loads.
    const other = await browser.newContext({ locale: "es-DO" });
    const second = await other.newPage();
    await second.goto(`${APP}/sign-in`);
    await expect(second.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
    await second.getByLabel("Correo electrónico").fill(email);
    await second.getByLabel("Contraseña").fill("supersecreta1");
    await second.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(second.getByRole("heading", { name: "My screens" })).toBeVisible();

    // Signing out keeps the browser's last language.
    await second.getByRole("button", { name: "Business and account" }).click();
    await second.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(second.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await other.close();

    // First visit from an English browser: English before and after signing up (nothing saved yet).
    const english = await browser.newContext({ locale: "en-US" });
    const visitor = await english.newPage();
    await visitor.goto(`${APP}/sign-in`);
    await expect(visitor.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await visitor.goto(`${APP}/sign-up`);
    await visitor.getByLabel("Your name").fill("Mark Stone");
    await visitor.getByLabel("Business name").fill("Stone Media");
    await visitor.getByLabel("Email").fill(`visitor-${stamp}@proyecta.local`);
    await visitor.getByLabel("Password").fill("supersecreta1");
    await visitor.getByRole("button", { name: "Create account" }).click();
    await expect(
      visitor.getByRole("heading", { name: "What do you want to do with Proyecta?" })
    ).toBeVisible();
    await visitor.getByRole("button", { name: "Continue" }).click();
    await expect(visitor.getByRole("heading", { name: "Publish your first screen" })).toBeVisible();
    await visitor.goto(APP);
    await expect(visitor.getByRole("heading", { name: "My screens" })).toBeVisible();
    await english.close();
  });

  test("invite a teammate who accepts from the email and appears as active", async ({
    page,
    request
  }) => {
    const stamp = Date.now();
    const teammate = `staff-${stamp}@proyecta.local`;
    await signUp(page, stamp);
    await page.goto(APP);
    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    await shot(page, "16-account-menu");
    await page.getByRole("menuitem", { name: "Equipo" }).click();
    await expect(page.getByRole("heading", { name: "Equipo" })).toBeVisible();
    await page.getByRole("button", { name: "Invitar persona" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Correo electrónico").fill(teammate);
    await dialog.getByLabel("Nombre (opcional)").fill("Luis Peña");
    await shot(page, "09-invite-dialog");
    await dialog.getByRole("button", { name: "Enviar invitación" }).click();
    await expect(page.getByTestId("member-row").filter({ hasText: teammate })).toContainText(
      "Pendiente"
    );
    await shot(page, "10-team-pending");

    let link = "";
    for (let i = 0; i < 40 && !link; i++) {
      const { messages } = await (
        await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${teammate}`)}`)
      ).json();
      if (messages.length) {
        const message = await (
          await request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
        ).json();
        link =
          (message.HTML as string)
            .replace(/&#x3D;/g, "=")
            .match(/href="([^"]*invitation\?token=[^"]+)"/)?.[1] ?? "";
      }
      if (!link) await page.waitForTimeout(250);
    }
    expect(link).toContain("/invitation?token=");

    const invitee = await page.context().browser()!.newPage();
    await invitee.goto(link);
    await expect(invitee.getByRole("heading", { name: "¡Invitación aceptada!" })).toBeVisible();
    await invitee.close();

    await page.reload();
    await expect(page.getByTestId("member-row").filter({ hasText: teammate })).toContainText(
      "Activo"
    );
  });

  test("changes the time zone, deletes the business and creates a new one", async ({ page }) => {
    const stamp = Date.now();
    await signUp(page, stamp);
    await page.goto(APP);

    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
    await shot(page, "13-settings");

    await page.getByLabel("Zona horaria").selectOption("America/New_York");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Zona horaria")).toHaveValue("America/New_York");

    await page.getByRole("button", { name: "Eliminar negocio" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "¿Eliminar Vallas del Cibao?" })
    ).toBeVisible();
    await shot(page, "14-delete-dialog");
    const confirmButton = dialog.getByRole("button", { name: "Eliminar negocio" });
    await expect(confirmButton).toBeDisabled();
    await dialog.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await expect(page.getByRole("heading", { name: "Crea tu negocio" })).toBeVisible();
    await shot(page, "15-create-business");
    await page.getByLabel("Nombre del negocio").fill("Pantallas Punta Cana");
    await page.getByRole("button", { name: "Crear negocio" }).click();

    await expect(page.getByRole("heading", { name: "Mis pantallas" })).toBeVisible();
    await page.getByRole("button", { name: "Negocio y cuenta" }).click();
    const businessRow = page.getByRole("menuitem", { name: /Pantallas Punta Cana/ });
    await expect(businessRow).toBeVisible();
    await expect(businessRow.locator(".icon")).toHaveCount(1);
  });
});

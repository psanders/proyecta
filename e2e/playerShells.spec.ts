/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * player-shells golden paths against the local stack (npm run db:up + demo media): hardware
 * figures from a shell reach the dashboard with their exact meaning, a plain browser explains what
 * it can't report, and a player resumes its last rotation from local media with no API.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const APP = "http://localhost:5175";
const PLAYER = "http://localhost:5174/";
const API = "http://localhost:3000/trpc";
const CODE = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

async function trpc<T>(
  request: APIRequestContext,
  path: string,
  input: unknown,
  auth?: { token: string; workspace?: string }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = `Bearer ${auth.token}`;
  if (auth?.workspace) headers["x-workspace"] = auth.workspace;
  const response = await request.post(`${API}/${path}`, { data: input, headers });
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBe(true);
  return body.result.data as T;
}

async function playerCode(player: Page): Promise<string> {
  await expect(player.locator(".code-box")).toHaveText(CODE);
  return (await player.locator(".code-box").textContent())!.trim();
}

/** Signs up in the dashboard, links `code` during onboarding and lands on the screen detail. */
async function linkThroughDashboard(page: Page, stamp: number, code: string, name: string) {
  await page.goto(`${APP}/sign-up`);
  await page.getByLabel("Tu nombre").fill("Rosa Almonte");
  await page.getByLabel("Nombre del negocio").fill("Vallas del Cibao");
  await page.getByLabel("Correo electrónico").fill(`shells-${stamp}@proyecta.local`);
  await page.getByLabel("Contraseña").fill("supersecreta1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Ingresa el código de vinculación").fill(code);
  await expect(page.getByText("Pantalla encontrada · lista para vincular")).toBeVisible();
  await page.getByRole("button", { name: "Vincular y continuar" }).click();
  await page.getByLabel("Nombre de la pantalla").fill(name);
  await page.getByLabel("Ciudad").fill("Santiago");
  await page.getByLabel("Resolución").selectOption("1920x1080");
  await page.getByRole("button", { name: "Guardar y publicar pantalla" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

function metric(page: Page, label: string) {
  return page.getByTestId("device-metric").filter({ hasText: label });
}

test.describe("player shells", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test("shows an Android shell's device figures on the screen detail", async ({
    page,
    context
  }) => {
    const stamp = Date.now();
    const player = await context.newPage();
    // What the Kotlin shell injects: RAM and disk are the device's; no CPU figure this time.
    await player.addInitScript((hwId) => {
      window.ProyectaShell = {
        hardwareId: () => hwId,
        shell: () => "ANDROID",
        version: () => "0.9.0",
        info: () => JSON.stringify({ deviceModel: "Xiaomi Mi Box S", osVersion: "Android 9" }),
        metrics: () =>
          JSON.stringify({
            memoryUsedMb: 900,
            memoryTotalMb: 1900,
            diskUsedMb: 3000,
            diskTotalMb: 8000
          })
      };
    }, `e2e-android-${stamp}`);
    await player.goto(`${PLAYER}?slotMs=1500`);
    const code = await playerCode(player);

    await linkThroughDashboard(page, stamp, code, "Pantalla Android");
    // The first heartbeat went out before linking; a reload shows its stored health.
    await page.reload();
    await expect(page.getByTestId("player-type")).toContainText("Android");
    await expect(page.getByTestId("shell-version")).toContainText("0.9.0");
    await expect(page.getByTestId("device-model")).toContainText("Xiaomi Mi Box S");
    await expect(metric(page, "Memoria (RAM)")).toContainText("900 MB / 1.9 GB");
    await expect(metric(page, "Disco")).toContainText("2.9 GB / 7.8 GB");
    await expect(metric(page, "CPU")).toContainText("No disponible en este equipo");
  });

  test("explains that a plain browser can't report the hardware", async ({ page, context }) => {
    const stamp = Date.now();
    const player = await context.newPage();
    await player.goto(`${PLAYER}?hw=e2e-browser-${stamp}&slotMs=1500`);
    const code = await playerCode(player);

    await linkThroughDashboard(page, stamp, code, "Pantalla Navegador");
    await page.reload();
    await expect(page.getByTestId("player-type")).toContainText("Navegador");
    for (const label of ["CPU", "Memoria (RAM)", "Disco"]) {
      await expect(metric(page, label)).toContainText("Requiere la app Proyecta");
    }
    await expect(page.getByTestId("shell-version")).toHaveCount(0);
  });

  test("resumes the last rotation from local media when the API is unreachable", async ({
    page,
    request
  }) => {
    test.use({ viewport: { width: 1600, height: 900 } });
    const stamp = Date.now();
    await page.goto(`${PLAYER}?debug=1&slotMs=1500&hw=e2e-offline-${stamp}`);
    const code = await playerCode(page);

    const owner = await trpc<{ accessToken: string; workspace: { accessKeyId: string } }>(
      request,
      "auth.signUp",
      {
        name: "Rosa Almonte",
        businessName: "Vallas Offline",
        email: `offline-${stamp}@proyecta.local`,
        password: "supersecreta1"
      }
    );
    const auth = { token: owner.accessToken, workspace: owner.workspace.accessKeyId };
    const screen = await trpc<{ id: string }>(
      request,
      "screens.create",
      { name: "Pantalla Offline", city: "Santo Domingo" },
      auth
    );
    await trpc(request, "screens.link", { screenId: screen.id, code }, auth);
    await expect(page.getByText("REPRODUCIENDO")).toBeVisible();

    // Wait until the whole rotation is in the media cache.
    await page.waitForFunction(
      async () => {
        const rotation = JSON.parse(localStorage.getItem("proyecta.state") ?? "null");
        const items = rotation?.state?.rotation?.items?.length ?? 0;
        const cached = await (await caches.open("proyecta-media-v1")).keys();
        return items > 0 && cached.length >= items;
      },
      undefined,
      { timeout: 30_000 }
    );

    // The API and its media go away; the page itself still loads (a shell serves it locally).
    for (const path of ["**/device/**", "**/media/**", "**/content/**"]) {
      await page.route(path, (route) => route.abort("internetdisconnected"));
    }
    await page.reload();
    await expect(page.getByText("REPRODUCIENDO")).toBeVisible();
    await page.waitForFunction(() => window.__proyecta.plays.length >= 2, undefined, {
      timeout: 30_000
    });
    const plays = await page.evaluate(() => window.__proyecta.plays);
    expect(plays.slice(0, 2).every((play) => play.result === "completed")).toBe(true);
  });
});

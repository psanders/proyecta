/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Needs the local stack (npm run db:up) and generated demo media (scripts/generate-demo-ads.sh).
 */
import { expect, test, type APIRequestContext } from "@playwright/test";

const PLAYER = "http://localhost:5174/";
const API = "http://localhost:3000/trpc";
const CODE = /\b[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}\b/;

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

test.describe("player on the device protocol", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("shows its permanent code, plays once linked, and returns to the code when unlinked", async ({
    page,
    request
  }) => {
    const stamp = Date.now();
    const hw = `e2e-player-${stamp}`;
    await page.goto(`${PLAYER}?debug=1&slotMs=1500&hw=${hw}`);
    await expect(page.getByRole("heading", { name: "Vincula esta pantalla" })).toBeVisible();
    await expect(page.getByText("Esperando conexión...")).toBeVisible();
    await expect(page.locator(".code-box")).toHaveText(CODE);
    const code = (await page.locator(".code-box").textContent())!.trim();
    expect(code).toMatch(CODE);

    // Reloading (same hardware id) keeps the same code.
    await page.reload();
    await expect(page.locator(".code-box")).toHaveText(code);

    const owner = await trpc<{ accessToken: string; workspace: { accessKeyId: string } }>(
      request,
      "auth.signUp",
      {
        name: "Rosa Almonte",
        businessName: "Vallas E2E",
        email: `e2e-${stamp}@proyecta.local`,
        password: "supersecreta1"
      }
    );
    const auth = { token: owner.accessToken, workspace: owner.workspace.accessKeyId };
    const screen = await trpc<{ id: string }>(
      request,
      "screens.create",
      { name: "Pantalla E2E", city: "Santo Domingo" },
      auth
    );
    await trpc(request, "screens.link", { screenId: screen.id, code }, auth);

    await expect(page.getByText("REPRODUCIENDO")).toBeVisible();
    await expect(page.getByText("Pantalla E2E · Conectada")).toBeVisible();
    await page.waitForFunction(() => window.__proyecta.plays.length >= 2, undefined, {
      timeout: 30_000
    });
    const plays = await page.evaluate(() => window.__proyecta.plays);
    expect(plays.slice(0, 2).map((p) => p.itemId)).toEqual(["cafe-aroma", "cerveceria-caribe"]);

    await trpc(request, "screens.unlink", { id: screen.id }, auth);
    await expect(page.getByRole("heading", { name: "Vincula esta pantalla" })).toBeVisible();
    await expect(page.locator(".code-box")).toHaveText(code);
  });
});

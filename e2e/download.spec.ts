/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * proyecta.do/download (packages/web): the latest installers come from the downloads store's
 * latest.json, and the page falls back to the GitHub release when the store can't be read.
 */
import { expect, test } from "@playwright/test";

const PAGE = `${process.env.WEB_URL ?? "http://localhost:5176"}/download/`;
const STORE = "https://api.proyecta.do/downloads";
const latest = {
  version: "0.9.0",
  publishedAt: "2026-09-23T15:00:00.000Z",
  files: [
    {
      platform: "android",
      arch: "universal",
      name: "Proyecta-v0.9.0.apk",
      url: "v0.9.0/Proyecta-v0.9.0.apk",
      size: 2_853_280,
      sha256: "a"
    },
    {
      platform: "linux",
      arch: "amd64",
      name: "proyecta-kiosk_0.9.0_amd64.deb",
      url: "v0.9.0/proyecta-kiosk_0.9.0_amd64.deb",
      size: 7_084_032,
      sha256: "b"
    },
    {
      platform: "linux",
      arch: "arm64",
      name: "proyecta-kiosk_0.9.0_arm64.deb",
      url: "v0.9.0/proyecta-kiosk_0.9.0_arm64.deb",
      size: 6_680_000,
      sha256: "c"
    },
    {
      platform: "windows",
      arch: "amd64",
      name: "ProyectaKiosk-0.9.0.exe",
      url: "v0.9.0/ProyectaKiosk-0.9.0.exe",
      size: 8_100_000,
      sha256: "d"
    }
  ]
};

test.describe("download page", () => {
  test("offers the latest installers from the downloads store", async ({ page }) => {
    await page.route(`${STORE}/latest.json`, (route) => route.fulfill({ json: latest }));
    await page.goto(PAGE);

    await expect(page.getByRole("heading", { name: "Descarga Proyecta." })).toBeVisible();
    await expect(page.getByTestId("version-chip")).toHaveText("v0.9.0 · 23 sep 2026");

    const android = page.getByTestId("platform-android");
    await expect(android.getByRole("link", { name: "Descargar APK" })).toHaveAttribute(
      "href",
      `${STORE}/v0.9.0/Proyecta-v0.9.0.apk`
    );
    await expect(android.getByTestId("file-info")).toHaveText("Proyecta-v0.9.0.apk · 2.7 MB");

    const linux = page.getByTestId("platform-linux");
    await expect(linux.getByRole("link", { name: "ARM64 · Raspberry Pi" })).toHaveAttribute(
      "href",
      `${STORE}/v0.9.0/proyecta-kiosk_0.9.0_arm64.deb`
    );
    await expect(
      page.getByTestId("platform-windows").getByRole("link", { name: "Descargar instalador" })
    ).toHaveAttribute("href", `${STORE}/v0.9.0/ProyectaKiosk-0.9.0.exe`);

    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute(
      "href",
      /\/sign-up$/
    );
  });

  test("falls back to the GitHub release when the store can't be read", async ({ page }) => {
    await page.route(`${STORE}/latest.json`, (route) => route.abort("internetdisconnected"));
    await page.goto(PAGE);

    await expect(page.getByTestId("platform-android").getByTestId("file-info")).toHaveText(
      "Última versión en GitHub"
    );
    await expect(page.getByTestId("version-chip")).toHaveCount(0);
    for (const link of await page.getByTestId("download-button").all()) {
      await expect(link).toHaveAttribute(
        "href",
        "https://github.com/psanders/proyecta/releases/latest"
      );
    }
  });

  test("links the nav back to the home page sections", async ({ page }) => {
    await page.route(`${STORE}/latest.json`, (route) => route.fulfill({ json: latest }));
    await page.goto(PAGE);
    await expect(page.getByRole("link", { name: "Cómo funciona" }).first()).toHaveAttribute(
      "href",
      "/#como-funciona"
    );
  });
});

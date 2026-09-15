/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Marketing site (packages/web): desktop and mobile layouts, and the draggable "La Red" map.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const WEB = "http://localhost:5176";

const HEADINGS = [
  "Tu anuncio, en las pantallas de todo el país.",
  "Poner un anuncio en una pantalla no debería tomar un mes.",
  "Una plataforma, dos lados de la pantalla.",
  "Todo lo que pasa en tus pantallas, en un solo lugar.",
  "Funciona en la pantalla que ya tienes.",
  "Si manejas muchas marcas o muchas sucursales.",
  "De Puerto Plata a Punta Cana.",
  "Lo que todos preguntan."
];

const CITIES = ["Puerto Plata", "Santiago", "Santo Domingo", "Punta Cana"];

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element has no box");
  return b;
}

/** True when the element's box lies fully inside the container's box. */
async function isInside(inner: Locator, outer: Locator) {
  const [i, o] = await Promise.all([box(inner), box(outer)]);
  return (
    i.x >= o.x && i.y >= o.y && i.x + i.width <= o.x + o.width && i.y + i.height <= o.y + o.height
  );
}

async function drag(page: Page, target: Locator, dx: number, dy: number) {
  const b = await box(target);
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders every section and the whole static network map", async ({ page }) => {
    await page.goto(WEB);
    for (const heading of HEADINGS) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    const map = page.getByTestId("network-map-desktop");
    await map.scrollIntoViewIfNeeded();
    for (const city of CITIES) {
      const pin = map.locator(`[data-pin="${city}"]`);
      await expect(pin).toBeVisible();
      expect(await isInside(pin, map), `${city} inside the card`).toBe(true);
    }
    await expect(page.getByTestId("network-map-mobile")).toBeHidden();
  });

  test("map markers sit on their cities without overlapping", async ({ page }) => {
    await page.goto(WEB);
    const map = page.getByTestId("network-map-desktop");
    await map.scrollIntoViewIfNeeded();
    const boxes = await Promise.all(CITIES.map((city) => box(map.locator(`[data-pin="${city}"]`))));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i]!, boxes[j]!];
        const overlap =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlap, `${CITIES[i]} and ${CITIES[j]} labels overlap`).toBe(false);
      }
    }
    // Geography: north coast above Santiago above the south coast, Punta Cana farthest east.
    const [puertoPlata, santiago, santoDomingo, puntaCana] = boxes.map((b) => b!);
    expect(puertoPlata.y).toBeLessThan(santiago.y);
    expect(santiago.y).toBeLessThan(santoDomingo.y);
    expect(puntaCana.x + puntaCana.width).toBeGreaterThan(santoDomingo.x + santoDomingo.width);
  });

  test("the hero card plays its slot and the cycle ring counts up", async ({ page }) => {
    await page.goto(WEB);
    const clock = page.getByText(/^0:\d\d \/ 0:10$/);
    const first = await clock.textContent();
    await expect.poll(() => clock.textContent(), { timeout: 4000 }).not.toBe(first);

    const plays = page.getByText("reproducciones al día").locator("xpath=preceding-sibling::span");
    await plays.scrollIntoViewIfNeeded();
    await expect(plays).toHaveText("540", { timeout: 4000 });
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("shows the static design with nothing animating", async ({ page }) => {
    await page.goto(WEB);
    await expect(page.getByText("0:06 / 0:10")).toBeVisible();
    await expect(page.getByRole("heading", { name: HEADINGS[0] })).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const plays = page.getByText("reproducciones al día").locator("xpath=preceding-sibling::span");
    await expect(plays).toHaveText("540");
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("opens the menu and navigates to a section", async ({ page }) => {
    await page.goto(WEB);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Agencias" }).click();
    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page).toHaveURL(/#agencias$/);
  });

  test("the network map starts on Santo Domingo and drags, clamped, to the other cities", async ({
    page
  }) => {
    await page.goto(WEB);
    await expect(page.getByTestId("network-map-desktop")).toBeHidden();
    const map = page.getByTestId("network-map-mobile");
    const layer = page.getByTestId("network-map-layer");
    await map.scrollIntoViewIfNeeded();

    const pin = (city: string) => map.locator(`[data-pin="${city}"]`);
    expect(await isInside(pin("Santo Domingo"), map)).toBe(true);
    expect(await isInside(pin("Punta Cana"), map)).toBe(false);
    expect(await isInside(pin("Puerto Plata"), map)).toBe(false);
    await expect(map.getByText("Arrastra para explorar")).toHaveCSS("opacity", "1");

    // East to Punta Cana: drag the map left.
    await drag(page, map, -300, 0);
    expect(await isInside(pin("Punta Cana"), map)).toBe(true);
    await expect(map.getByText("Arrastra para explorar")).toHaveCSS("opacity", "0");

    // North to Puerto Plata and Santiago: drag down and back west.
    await drag(page, map, 300, 300);
    expect(await isInside(pin("Puerto Plata"), map)).toBe(true);

    // Far past the edges the map stops: no empty space inside the card.
    for (const [dx, dy] of [
      [3000, 3000],
      [-3000, -3000]
    ] as const) {
      await drag(page, map, dx, dy);
      const [m, l] = await Promise.all([box(map), box(layer)]);
      expect(l.x).toBeLessThanOrEqual(m.x + 0.5);
      expect(l.y).toBeLessThanOrEqual(m.y + 0.5);
      expect(l.x + l.width).toBeGreaterThanOrEqual(m.x + m.width - 0.5);
      expect(l.y + l.height).toBeGreaterThanOrEqual(m.y + m.height - 0.5);
    }
  });

  test("the network map pans with the arrow keys", async ({ page }) => {
    await page.goto(WEB);
    const map = page.getByTestId("network-map-mobile");
    const layer = page.getByTestId("network-map-layer");
    await map.focus();
    const before = await box(layer);
    await page.keyboard.press("ArrowRight");
    const after = await box(layer);
    expect(after.x).toBeLessThan(before.x);
  });

  test("a touch drag moves the map instead of scrolling the page", async ({ page }) => {
    await page.goto(WEB);
    const map = page.getByTestId("network-map-mobile");
    const layer = page.getByTestId("network-map-layer");
    await map.scrollIntoViewIfNeeded();
    const scrollY = await page.evaluate(() => window.scrollY);
    const before = await box(layer);

    const b = await box(map);
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, points: { x: number; y: number }[]) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await touch("touchStart", [{ x, y }]);
    for (let step = 1; step <= 10; step++) await touch("touchMove", [{ x: x - step * 20, y }]);
    await touch("touchEnd", []);

    await expect.poll(async () => (await box(layer)).x).toBeLessThan(before.x - 100);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  });

  test("a touch swipe outside the map still scrolls the page", async ({ page }) => {
    await page.goto(WEB);
    const heading = page.getByRole("heading", { name: "De Puerto Plata a Punta Cana." });
    await heading.scrollIntoViewIfNeeded();
    const scrollY = await page.evaluate(() => window.scrollY);
    const b = await box(heading);
    const x = b.x + 20;
    const y = b.y + b.height / 2 + 100;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, points: { x: number; y: number }[]) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await touch("touchStart", [{ x, y }]);
    for (let step = 1; step <= 10; step++) await touch("touchMove", [{ x, y: y - step * 20 }]);
    await touch("touchEnd", []);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * The money path end to end, against the real HTTP app and the Postgres test database: a device
 * reports plays over /device/v1/play-logs, they land as priced PlayLog rows, and the owner's
 * earnings summary adds up to exactly what was charged.
 *
 * The pricing rules themselves are unit-tested in test/api/devices; what this file adds is proof
 * that the device protocol, the pricing and the earnings read model agree once a real database and
 * real HTTP are in the middle. Identity is not needed — dashboard callers use a stubbed verifier.
 */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { expect } from "chai";
import type { Manifest } from "@proyecta/common";
import { createScreenRotationLoader } from "../../src/api/ads/createScreenRotationLoader.js";
import { createApp } from "../../src/app.js";
import { createDbClient } from "../../src/db.js";
import { EventHub } from "../../src/events/hub.js";
import { resolveContext, type Services } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";
import { createCallerFactory } from "../../src/trpc/trpc.js";
import { testConfig } from "./testConfig.js";

const db = createDbClient(testConfig().databaseUrl);

/** The default rotation. Its items are nobody's ad, so plays of them are billed to the screen. */
const rotation: Manifest = {
  version: "billing-1",
  name: "Rotación General",
  screenName: "Pantalla Demo",
  width: 1920,
  height: 1080,
  items: [
    {
      id: "cafe-aroma",
      type: "image",
      advertiser: "Café Aroma",
      title: "Café",
      durationMs: 10000,
      renditions: { webp: "/media/cafe-aroma.webp" }
    }
  ]
};

const hub = new EventHub();
const principal = (workspace: string) => ({
  userRef: "u1",
  accessKeyId: "US1",
  access: [{ accessKeyId: workspace, role: "WORKSPACE_ADMIN" }]
});
const services: Services = {
  identity: {} as Services["identity"],
  verifyAccessToken: async (token) =>
    token.startsWith("admin:") ? principal(token.slice(6)) : null,
  dashboardUrl: "http://app",
  identityBridgeUrl: "http://bridge",
  fetch,
  sync: {
    db,
    hub,
    loadRotation: async () => rotation,
    loadScreenRotation: createScreenRotationLoader(db)
  },
  pairingLimiter: { take: () => true },
  media: {} as Services["media"],
  notifyScreens: async () => undefined
};
const createCaller = createCallerFactory(appRouter);
const dashboard = async (workspace: string) =>
  createCaller(
    await resolveContext(services, {
      authorization: `Bearer admin:${workspace}`,
      "x-workspace": workspace
    })
  );

let server: Server;
let base = "";

async function register(hwId: string) {
  const res = await fetch(`${base}/device/v1/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hwId, shell: "BROWSER", resolution: "1920x1080" })
  });
  return (await res.json()) as { code: string; deviceToken: string };
}

type Play = {
  itemId: string;
  codec: string;
  result: "completed" | "stalled" | "failed";
  startedAt: string;
  endedAt: string;
  durationMs?: number;
};

async function reportPlays(deviceToken: string, plays: Play[]) {
  const res = await fetch(`${base}/device/v1/play-logs`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${deviceToken}` },
    body: JSON.stringify({ plays })
  });
  expect(res.status, await res.clone().text()).to.equal(200);
  return (await res.json()) as { accepted: number };
}

/**
 * A play that started `offsetSeconds` after the device was linked. Plays are attributed to a screen
 * by the binding open at `startedAt`, so a play timestamped before the link belongs to no screen and
 * is never billable — hence anchoring to the link rather than to "now minus something".
 */
function play(
  linkedAt: Date,
  itemId: string,
  durationMs: number,
  offsetSeconds = 1,
  result: Play["result"] = "completed"
): Play {
  const startedAt = new Date(linkedAt.getTime() + offsetSeconds * 1000);
  return {
    itemId,
    codec: "webp",
    result,
    startedAt: startedAt.toISOString(),
    endedAt: new Date(startedAt.getTime() + durationMs).toISOString(),
    durationMs
  };
}

describe("billing (integration: HTTP + Postgres)", function () {
  this.timeout(20_000);
  const stamp = Date.now();
  const OWNER = `WO-bill-owner-${stamp}`;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = createApp(services).listen(0, resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.$disconnect();
  });

  /** A complete screen at US$ 0.75 per 5 s, with a device linked to it. */
  async function linkedScreen(workspace: string, name: string, rateDollars: number) {
    const caller = await dashboard(workspace);
    const screen = await caller.screens.create({
      name,
      city: "Santo Domingo",
      latitude: 18.4861,
      longitude: -69.9312,
      availableDays: [1, 2, 3, 4, 5, 6, 7],
      startTime: "00:00",
      endTime: "23:59",
      ratePerFiveSecondsDollars: rateDollars
    });
    const device = await register(`billing-${name}-${stamp}`);
    await caller.screens.link({ screenId: screen.id, code: device.code });
    return { caller, screen, device, linkedAt: new Date() };
  }

  it("should price a completed play at the screen's rate and show it in earnings", async () => {
    const { caller, screen, device, linkedAt } = await linkedScreen(
      OWNER,
      `Valla Billing ${stamp}`,
      0.75
    );

    // 15 s at US$ 0.75 per 5 s = 3 units = US$ 2.25.
    await reportPlays(device.deviceToken, [play(linkedAt, "cafe-aroma", 15000)]);

    const rows = await db.playLog.findMany({ where: { screenId: screen.id } });
    expect(rows).to.have.length(1);
    expect(rows[0]!.billedUnits).to.equal(3);
    expect(rows[0]!.rateCentsAtPlay).to.equal(75);
    expect(rows[0]!.house).to.equal(false);

    const earnings = await caller.screens.earnings({ id: screen.id });
    expect(earnings.today.plays).to.equal(1);
    expect(earnings.today.earningsCents).to.equal(225);
    expect(earnings.today.housePlays).to.equal(0);
  });

  it("should not bill stalled or failed plays, but still record them", async () => {
    const { caller, screen, device, linkedAt } = await linkedScreen(
      OWNER,
      `Valla Fallos ${stamp}`,
      1.0
    );

    await reportPlays(device.deviceToken, [
      play(linkedAt, "cafe-aroma", 10000, 2, "stalled"),
      play(linkedAt, "cafe-aroma", 10000, 3, "failed")
    ]);

    const rows = await db.playLog.findMany({ where: { screenId: screen.id } });
    expect(rows).to.have.length(2);
    expect(rows.every((r) => r.billedUnits === null)).to.equal(true);

    const earnings = await caller.screens.earnings({ id: screen.id });
    expect(earnings.today.earningsCents).to.equal(0);
  });

  it("should keep an earlier play at the rate it was priced at when the rate changes", async () => {
    const { caller, screen, device, linkedAt } = await linkedScreen(
      OWNER,
      `Valla Tarifa ${stamp}`,
      0.5
    );

    await reportPlays(device.deviceToken, [play(linkedAt, "cafe-aroma", 10000, 4)]);
    // 10 s at US$ 0.50 = 2 units = US$ 1.00.
    expect((await caller.screens.earnings({ id: screen.id })).today.earningsCents).to.equal(100);

    await caller.screens.update({
      id: screen.id,
      name: `Valla Tarifa ${stamp}`,
      city: "Santo Domingo",
      latitude: 18.4861,
      longitude: -69.9312,
      availableDays: [1, 2, 3, 4, 5, 6, 7],
      startTime: "00:00",
      endTime: "23:59",
      ratePerFiveSecondsDollars: 5.0
    });

    // The old play keeps its snapshot; only a later play uses the new rate.
    const after = await caller.screens.earnings({ id: screen.id });
    expect(after.today.earningsCents).to.equal(100);

    await reportPlays(device.deviceToken, [play(linkedAt, "cafe-aroma", 10000, 5)]);
    // Adds 2 units at US$ 5.00 = US$ 10.00, on top of the US$ 1.00 already earned.
    expect((await caller.screens.earnings({ id: screen.id })).today.earningsCents).to.equal(1100);
  });

  it("should count a business's ad on its own screen as a house play that earns nothing", async () => {
    const { caller, screen, device, linkedAt } = await linkedScreen(
      OWNER,
      `Valla Propia ${stamp}`,
      2.0
    );

    // The ad belongs to the same business that owns the screen, so it is a house play. Built
    // directly: this is about pricing, not about the asset pipeline.
    const asset = await db.asset.create({
      data: {
        workspaceAccessKeyId: OWNER,
        name: "Propio",
        kind: "IMAGE",
        status: "READY",
        durationMs: 10000,
        width: 1920,
        height: 1080,
        orientation: "LANDSCAPE",
        sourceFile: "propio.png",
        sizeBytes: 1000,
        sha256: `sha-${stamp}`
      }
    });
    const ad = await db.ad.create({
      data: {
        workspaceAccessKeyId: OWNER,
        name: "Anuncio propio",
        advertiserName: "Vallas del Caribe",
        assetId: asset.id,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2027-01-01")
      }
    });
    const placement = await db.adPlacement.create({
      data: { adId: ad.id, screenId: screen.id, assetId: asset.id, status: "APPROVED" }
    });

    await reportPlays(device.deviceToken, [play(linkedAt, placement.id, 10000, 6)]);

    const row = await db.playLog.findFirst({ where: { itemId: placement.id } });
    expect(row!.house).to.equal(true);
    expect(row!.billedUnits).to.equal(null);
    expect(row!.rateCentsAtPlay).to.equal(null);

    // Counted as a play, shown apart, and worth nothing.
    const earnings = await caller.screens.earnings({ id: screen.id });
    expect(earnings.today.housePlays).to.equal(1);
    expect(earnings.today.earningsCents).to.equal(0);
  });

  it("should bill another business's ad to that advertiser", async () => {
    const advertiserWorkspace = `WO-bill-adv-${stamp}`;
    const { caller, screen, device, linkedAt } = await linkedScreen(
      OWNER,
      `Valla Ajena ${stamp}`,
      1.5
    );

    const asset = await db.asset.create({
      data: {
        workspaceAccessKeyId: advertiserWorkspace,
        name: "Ajeno",
        kind: "IMAGE",
        status: "READY",
        durationMs: 15000,
        width: 1920,
        height: 1080,
        orientation: "LANDSCAPE",
        sourceFile: "ajeno.png",
        sizeBytes: 1000,
        sha256: `sha-adv-${stamp}`
      }
    });
    const ad = await db.ad.create({
      data: {
        workspaceAccessKeyId: advertiserWorkspace,
        name: "Anuncio ajeno",
        advertiserName: "Café Aroma",
        assetId: asset.id,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2027-01-01")
      }
    });
    const placement = await db.adPlacement.create({
      data: { adId: ad.id, screenId: screen.id, assetId: asset.id, status: "APPROVED" }
    });

    // No durationMs reported: the asset's configured 15 s is used. 3 units at US$ 1.50 = US$ 4.50.
    const startedAt = new Date(linkedAt.getTime() + 7000);
    await reportPlays(device.deviceToken, [
      {
        itemId: placement.id,
        codec: "webp",
        result: "completed",
        startedAt: startedAt.toISOString(),
        endedAt: new Date(startedAt.getTime() + 15000).toISOString()
      }
    ]);

    const row = await db.playLog.findFirst({ where: { itemId: placement.id } });
    expect(row!.house).to.equal(false);
    expect(row!.billedUnits).to.equal(3);
    expect(row!.rateCentsAtPlay).to.equal(150);
    expect(row!.advertiserWorkspaceAccessKeyId).to.equal(advertiserWorkspace);

    const earnings = await caller.screens.earnings({ id: screen.id });
    expect(earnings.today.earningsCents).to.equal(450);
    expect(earnings.today.housePlays).to.equal(0);
  });
});

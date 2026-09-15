/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Runs the real HTTP app against the Postgres test database. Identity is not needed: dashboard
 * callers are resolved with a stubbed token verifier.
 */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import {
  createSseParser,
  deviceStateSchema,
  type DeviceState,
  type Manifest
} from "@proyecta/common";
import { createScreenRotationLoader } from "../../src/api/ads/createScreenRotationLoader.js";
import { createApp } from "../../src/app.js";
import { createDbClient } from "../../src/db.js";
import { EventHub } from "../../src/events/hub.js";
import { resolveContext, type Services } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";
import { createCallerFactory } from "../../src/trpc/trpc.js";
import { testConfig } from "./testConfig.js";

const db = createDbClient(testConfig().databaseUrl);
const rotation: Manifest = {
  version: "test-1",
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
    body: JSON.stringify({
      hwId,
      shell: "BROWSER",
      resolution: "1920x1080",
      playerVersion: "0.1.0"
    })
  });
  return (await res.json()) as { code: string; deviceToken: string; created: boolean };
}

/** Opens the device event stream and returns a function that waits for the next event of a type. */
async function openEvents(token: string) {
  const controller = new AbortController();
  const res = await fetch(`${base}/device/v1/events`, {
    headers: { authorization: `Bearer ${token}` },
    signal: controller.signal
  });
  expect(res.status).to.equal(200);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();
  const pending: { event: string; data: DeviceState }[] = [];

  const next = async (type: string): Promise<DeviceState> => {
    for (;;) {
      const index = pending.findIndex((m) => m.event === type);
      if (index !== -1) return pending.splice(index, 1)[0]!.data;
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended");
      for (const m of parse(decoder.decode(value, { stream: true }))) {
        pending.push({ event: m.event, data: deviceStateSchema.parse(JSON.parse(m.data)) });
      }
    }
  };
  return { next, close: () => controller.abort() };
}

async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  try {
    await promise;
    expect.fail(`expected ${code}`);
  } catch (err) {
    expect((err as TRPCError).code).to.equal(code);
  }
}

describe("device-protocol (integration: HTTP + Postgres)", function () {
  this.timeout(20_000);
  const stamp = Date.now();
  const WS = `WO-test-${stamp}`;

  before(async () => {
    await db.playLog.deleteMany();
    await db.adPlacement.deleteMany();
    await db.ad.deleteMany();
    await db.asset.deleteMany();
    await db.deviceBinding.deleteMany();
    await db.screen.deleteMany();
    await db.device.deleteMany();
    server = createApp(services).listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    server.close();
    await db.$disconnect();
  });

  it("rejects device calls without a valid token, and old tokens after re-registering", async () => {
    expect((await fetch(`${base}/device/v1/state`)).status).to.equal(401);
    const first = await register(`hw-token-${stamp}`);
    const second = await register(`hw-token-${stamp}`);
    expect(second.code).to.equal(first.code);
    const auth = (t: string) =>
      fetch(`${base}/device/v1/state`, { headers: { authorization: `Bearer ${t}` } });
    expect((await auth(first.deviceToken)).status).to.equal(401);
    expect((await auth(second.deviceToken)).status).to.equal(200);
  });

  it("pairs a waiting player live, then unlinks it and re-links it to another screen", async () => {
    const device = await register(`hw-pair-${stamp}`);
    const events = await openEvents(device.deviceToken);
    const initial = await events.next("state");
    expect(initial).to.include({ linked: false, rotation: null });

    const owner = await dashboard(WS);
    const lobby = await owner.screens.create({ name: "Pantalla Lobby", city: "Santiago" });
    expect(await owner.screens.checkCode({ code: device.code.toLowerCase() })).to.deep.equal({
      available: true,
      resolution: "1920x1080"
    });

    const linkedView = await owner.screens.link({ screenId: lobby.id, code: device.code });
    expect(linkedView).to.include({ status: "ONLINE", resolution: "1920x1080" });
    const linked = await events.next("linked");
    expect(linked.screen).to.deep.equal({ id: lobby.id, name: "Pantalla Lobby" });
    expect(linked.rotation?.version).to.equal("test-1");

    // Owners can't archive a linked screen, and the player can't be linked twice.
    await expectCode(owner.screens.archive({ id: lobby.id }), "PRECONDITION_FAILED");
    const other = await owner.screens.create({ name: "Pantalla Terraza", city: "Puerto Plata" });
    expect(await owner.screens.checkCode({ code: device.code })).to.deep.equal({
      available: false,
      reason: "LINKED"
    });
    await expectCode(owner.screens.link({ screenId: other.id, code: device.code }), "CONFLICT");

    await owner.screens.unlink({ id: lobby.id });
    expect((await events.next("unlinked")).linked).to.equal(false);

    await owner.screens.link({ screenId: other.id, code: device.code });
    expect((await events.next("linked")).screen?.name).to.equal("Pantalla Terraza");
    await owner.screens.unlink({ id: other.id });
    await events.next("unlinked");

    await owner.screens.archive({ id: lobby.id });
    const lists = {
      active: await owner.screens.list({}),
      archived: await owner.screens.list({ archived: true })
    };
    expect(lists.archived.screens.map((s) => s.name)).to.deep.equal(["Pantalla Lobby"]);
    expect(lists.active.screens.map((s) => s.name)).to.deep.equal(["Pantalla Terraza"]);
    events.close();
  });

  it("links exactly once when two businesses race for the same player", async () => {
    const device = await register(`hw-race-${stamp}`);
    const [a, b] = [await dashboard(`WO-a-${stamp}`), await dashboard(`WO-b-${stamp}`)];
    const [screenA, screenB] = [
      await a.screens.create({ name: "A", city: "Santo Domingo" }),
      await b.screens.create({ name: "B", city: "Santo Domingo" })
    ];

    const results = await Promise.allSettled([
      a.screens.link({ screenId: screenA.id, code: device.code }),
      b.screens.link({ screenId: screenB.id, code: device.code })
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).to.have.length(1);
    const deviceRow = await db.device.findUniqueOrThrow({ where: { code: device.code } });
    expect(
      await db.deviceBinding.count({ where: { deviceId: deviceRow.id, unlinkedAt: null } })
    ).to.equal(1);
  });

  it("keeps screens private to their workspace", async () => {
    const mine = await (
      await dashboard(`WO-mine-${stamp}`)
    ).screens.create({ name: "Mía", city: "La Romana" });
    await expectCode(
      (await dashboard(`WO-theirs-${stamp}`)).screens.get({ id: mine.id }),
      "NOT_FOUND"
    );
  });

  it("stores heartbeats and idempotent play logs attributed to the linked screen", async () => {
    const device = await register(`hw-logs-${stamp}`);
    const owner = await dashboard(`WO-logs-${stamp}`);
    const screen = await owner.screens.create({ name: "Pantalla Caja", city: "Santiago" });
    await owner.screens.link({ screenId: screen.id, code: device.code });
    const post = (path: string, body: unknown) =>
      fetch(`${base}/device/v1/${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${device.deviceToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });

    expect(
      (
        await post("heartbeat", {
          playerVersion: "0.1.0",
          uptimeSec: 120,
          codec: "vp9",
          currentItemId: "cafe-aroma"
        })
      ).status
    ).to.equal(200);
    const detail = await owner.screens.get({ id: screen.id });
    expect(detail.device?.health).to.include({
      playerVersion: "0.1.0",
      codec: "vp9",
      uptimeSec: 120
    });

    const startedAt = new Date().toISOString();
    const batch = {
      plays: [
        { itemId: "cafe-aroma", codec: "webp", result: "completed", startedAt, endedAt: startedAt }
      ]
    };
    await post("play-logs", batch);
    await post("play-logs", batch);
    expect(await db.playLog.count({ where: { screenId: screen.id } })).to.equal(1);

    expect((await post("heartbeat", { uptimeSec: -1 })).status).to.equal(400);
  });

  it("bills pay-per-display plays by the reported duration, falling back to the rotation and snapshotting the rate", async () => {
    const device = await register(`hw-ppd-${stamp}`);
    const owner = await dashboard(`WO-ppd-${stamp}`);
    const screen = await owner.screens.create({ name: "Pantalla Tarifa", city: "La Vega" });
    await owner.screens.link({ screenId: screen.id, code: device.code });
    const post = (body: unknown) =>
      fetch(`${base}/device/v1/play-logs`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${device.deviceToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });
    let t = Date.now();
    const at = () => new Date(t++).toISOString();

    // Before any rate is set, earnings are unavailable.
    expect(await owner.screens.earnings({ id: screen.id })).to.deep.equal({ available: false });

    await owner.screens.update({
      id: screen.id,
      name: "Pantalla Tarifa",
      city: "La Vega",
      ratePerFiveSecondsDollars: 2.5
    });

    await post({
      plays: [
        // Billed by the device-reported duration (15s -> 3 units).
        {
          itemId: "cafe-aroma",
          codec: "webp",
          result: "completed",
          startedAt: at(),
          endedAt: at(),
          durationMs: 15000
        },
        // No duration reported (older player) -> falls back to the rotation's 10s (2 units).
        {
          itemId: "cafe-aroma",
          codec: "webp",
          result: "completed",
          startedAt: at(),
          endedAt: at()
        },
        // Reported but not a multiple of 5000ms -> not billable, no rotation fallback.
        {
          itemId: "cafe-aroma",
          codec: "webp",
          result: "completed",
          startedAt: at(),
          endedAt: at(),
          durationMs: 8000
        },
        // Stalled -> never billable, even with a valid duration.
        {
          itemId: "cafe-aroma",
          codec: "webp",
          result: "stalled",
          startedAt: at(),
          endedAt: at(),
          durationMs: 15000
        }
      ]
    });

    const afterFirstBatch = await owner.screens.earnings({ id: screen.id });
    expect(afterFirstBatch).to.deep.equal({
      available: true,
      today: { plays: 2, billableSeconds: 25, earningsCents: 1250, housePlays: 0 },
      last7Days: { plays: 2, billableSeconds: 25, earningsCents: 1250, housePlays: 0 }
    });

    // Changing the rate doesn't rewrite the plays already recorded.
    await owner.screens.update({
      id: screen.id,
      name: "Pantalla Tarifa",
      city: "La Vega",
      ratePerFiveSecondsDollars: 3
    });
    await post({
      plays: [
        {
          itemId: "cafe-aroma",
          codec: "webp",
          result: "completed",
          startedAt: at(),
          endedAt: at(),
          durationMs: 20000
        }
      ]
    });

    const afterRateChange = await owner.screens.earnings({ id: screen.id });
    expect(afterRateChange).to.deep.equal({
      available: true,
      today: { plays: 3, billableSeconds: 45, earningsCents: 2450, housePlays: 0 },
      last7Days: { plays: 3, billableSeconds: 45, earningsCents: 2450, housePlays: 0 }
    });

    const rows = await db.playLog.findMany({
      where: { screenId: screen.id, result: "COMPLETED" },
      orderBy: { startedAt: "asc" },
      select: { billedUnits: true, rateCentsAtPlay: true }
    });
    expect(rows).to.deep.equal([
      { billedUnits: 3, rateCentsAtPlay: 250 },
      { billedUnits: 2, rateCentsAtPlay: 250 },
      { billedUnits: null, rateCentsAtPlay: 250 },
      { billedUnits: 4, rateCentsAtPlay: 300 }
    ]);
  });
});

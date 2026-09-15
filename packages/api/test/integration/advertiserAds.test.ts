/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Advertiser ads end to end against the Postgres test database and the real ffprobe/ffmpeg:
 * upload → renditions → ad on an own screen and another business's screen → per-screen rotations,
 * house plays, removal and cancellation. Identity is stubbed like the device-protocol suite.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import {
  createSseParser,
  deviceStateSchema,
  localDateString,
  type AssetView,
  type DeviceState,
  type Manifest
} from "@proyecta/common";
import { createScreenRotationLoader } from "../../src/api/ads/createScreenRotationLoader.js";
import { createApp } from "../../src/app.js";
import { createDbClient } from "../../src/db.js";
import { createNotifyScreens } from "../../src/events/createNotifyScreens.js";
import { EventHub } from "../../src/events/hub.js";
import { createContentStore } from "../../src/media/contentStore.js";
import { createRenditionQueue } from "../../src/media/createRenditionQueue.js";
import { createFfmpegRenderer, createFfprobe } from "../../src/media/ffmpeg.js";
import { resolveContext, type Services } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";
import { createCallerFactory } from "../../src/trpc/trpc.js";
import { testConfig } from "./testConfig.js";

const run = promisify(execFile);
const db = createDbClient(testConfig().databaseUrl);
const defaultRotation: Manifest = {
  version: "default-1",
  name: "Rotación General",
  screenName: "Demo",
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

describe("advertiser ads (integration: HTTP + Postgres + ffmpeg)", function () {
  this.timeout(60_000);
  const stamp = Date.now();
  const ADVERTISER = `WO-adv-${stamp}`;
  const OTHER = `WO-other-${stamp}`;
  let server: Server;
  let base = "";
  let services: Services;
  let work = "";

  const principal = (workspace: string) => ({
    userRef: "u1",
    accessKeyId: "US1",
    access: [{ accessKeyId: workspace, role: "WORKSPACE_ADMIN" }]
  });
  const dashboard = async (workspace: string) =>
    createCallerFactory(appRouter)(
      await resolveContext(services, {
        authorization: `Bearer admin:${workspace}`,
        "x-workspace": workspace
      })
    );

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
    return (await res.json()) as { code: string; deviceToken: string };
  }

  async function state(token: string): Promise<DeviceState> {
    const res = await fetch(`${base}/device/v1/state`, {
      headers: { authorization: `Bearer ${token}` }
    });
    return deviceStateSchema.parse(await res.json());
  }

  async function openEvents(token: string) {
    const controller = new AbortController();
    const res = await fetch(`${base}/device/v1/events`, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal
    });
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

  const upload = (workspace: string, body: Buffer, type: string, query: string) =>
    fetch(`${base}/uploads/assets?${query}`, {
      method: "POST",
      headers: {
        authorization: `Bearer admin:${workspace}`,
        "x-workspace": workspace,
        "content-type": type
      },
      body
    });

  async function completeScreen(workspace: string, name: string) {
    const owner = await dashboard(workspace);
    return owner.screens.create({
      name,
      city: "Santo Domingo",
      latitude: 18.4861,
      longitude: -69.9312,
      orientation: "LANDSCAPE",
      availableDays: [1, 2, 3, 4, 5, 6, 7],
      startTime: "06:00",
      endTime: "23:00",
      ratePerFiveSecondsDollars: 2
    });
  }

  before(async () => {
    work = await mkdtemp(join(tmpdir(), "proyecta-ads-it-"));
    const hub = new EventHub();
    const sync = {
      db,
      hub,
      loadRotation: async () => defaultRotation,
      loadScreenRotation: createScreenRotationLoader(db)
    };
    const store = createContentStore(join(work, "content"));
    services = {
      identity: {
        listWorkspaces: async () => ({
          items: [{ ref: "r1", accessKeyId: ADVERTISER, name: "Café Aroma" }]
        })
      } as unknown as Services["identity"],
      verifyAccessToken: async (token) =>
        token.startsWith("admin:") ? principal(token.slice(6)) : null,
      dashboardUrl: "http://app",
      identityBridgeUrl: "http://bridge",
      fetch,
      sync,
      pairingLimiter: { take: () => true },
      media: {
        store,
        probe: createFfprobe(),
        queue: createRenditionQueue({ db, store, render: createFfmpegRenderer() }),
        tempDir: join(work, "tmp")
      },
      notifyScreens: createNotifyScreens(sync)
    };
    server = createApp(services, { contentDir: join(work, "content") }).listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    server.close();
    await db.$disconnect();
  });

  it("uploads, checks and prepares files, then plays an own-screen ad and never a pending one", async () => {
    // A generated 1280x720 PNG, and a text file pretending to be one.
    const png = join(work, "combo.png");
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=orange:s=1280x720",
      "-frames:v",
      "1",
      png
    ]);
    const image = await readFile(png);
    await writeFile(join(work, "fake.png"), "not an image");

    const noDuration = await upload(ADVERTISER, image, "image/png", "name=Combo");
    expect(noDuration.status).to.equal(400);
    const noDurationBody = (await noDuration.json()) as {
      error: { data: { fieldErrors: { field: string; message: string }[] } };
    };
    expect(noDurationBody.error.data.fieldErrors[0]).to.deep.equal({
      field: "durationMs",
      message: "Elige 5, 10 o 15 segundos para la imagen",
      code: "custom",
      messageId: "validation.asset.imageDuration"
    });

    const fake = await upload(
      ADVERTISER,
      await readFile(join(work, "fake.png")),
      "image/png",
      "durationMs=5000&fileName=fake.png"
    );
    expect(fake.status).to.equal(400);
    expect(((await fake.json()) as { error: { message: string } }).error.message).to.equal(
      "No pudimos leer el archivo como video o imagen"
    );

    const accepted = await upload(
      ADVERTISER,
      image,
      "image/png",
      "durationMs=10000&fileName=Combo%20Desayuno.png"
    );
    expect(accepted.status).to.equal(201);
    const { asset } = (await accepted.json()) as { asset: AssetView };
    expect(asset).to.include({
      name: "Combo Desayuno",
      status: "PROCESSING",
      durationMs: 10000,
      orientation: "LANDSCAPE"
    });
    await services.media.queue.idle();
    const advertiser = await dashboard(ADVERTISER);
    const [ready] = await advertiser.assets.list();
    expect(ready).to.include({ id: asset.id, status: "READY" });
    expect((await fetch(`${base}${ready!.renditions.webp}`)).status).to.equal(200);

    // One own screen and one of another business, each with a linked player.
    const own = await completeScreen(ADVERTISER, "Farmacia Luz");
    const other = await completeScreen(OTHER, "Valla 27 de Febrero");
    const ownDevice = await register(`hw-ads-own-${stamp}`);
    const otherDevice = await register(`hw-ads-other-${stamp}`);
    await advertiser.screens.link({ screenId: own.id, code: ownDevice.code });
    await (await dashboard(OTHER)).screens.link({ screenId: other.id, code: otherDevice.code });

    const catalog = await advertiser.ads.catalog({});
    expect(
      catalog.filter((s) => [own.id, other.id].includes(s.id)).map((s) => [s.name, s.own])
    ).to.deep.equal([
      ["Farmacia Luz", true],
      ["Valla 27 de Febrero", false]
    ]);

    const events = await openEvents(ownDevice.deviceToken);
    await events.next("state");
    const today = localDateString(new Date(), "America/Santo_Domingo");
    const { id } = await advertiser.ads.create({
      name: "Promo Desayuno",
      assetId: asset.id,
      startDate: today,
      endDate: today,
      screenIds: [own.id, other.id]
    });

    const updated = await events.next("rotation.updated");
    expect(updated.rotation?.items.map((i) => [i.title, i.advertiser, i.durationMs])).to.deep.equal(
      [["Promo Desayuno", "Café Aroma", 10000]]
    );
    expect((await state(otherDevice.deviceToken)).rotation?.version).to.equal("default-1");

    const detail = await advertiser.ads.get({ id });
    expect(detail).to.include({ status: "ON_AIR", advertiserName: "Café Aroma" });
    expect(detail.screens).to.deep.equal({ total: 2, approved: 1 });
    expect(detail.adScreens.map((s) => [s.name, s.status])).to.deep.equal([
      ["Farmacia Luz", "ON_AIR"],
      ["Valla 27 de Febrero", "PENDING_APPROVAL"]
    ]);

    // A play of the own ad on the own screen is a house play: counted, never billed.
    const placementId = updated.rotation!.items[0]!.id;
    const startedAt = new Date().toISOString();
    await fetch(`${base}/device/v1/play-logs`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownDevice.deviceToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        plays: [
          {
            itemId: placementId,
            codec: "webp",
            result: "completed",
            startedAt,
            endedAt: startedAt,
            durationMs: 10000
          }
        ]
      })
    });
    const earnings = await advertiser.screens.earnings({ id: own.id });
    expect(earnings).to.deep.include({ available: true });
    expect(earnings.available && earnings.today).to.deep.equal({
      plays: 0,
      billableSeconds: 0,
      earningsCents: 0,
      housePlays: 1
    });
    expect((await advertiser.ads.get({ id })).stats).to.deep.equal({
      plays: 1,
      housePlays: 1,
      spendCents: 0
    });
    expect(await advertiser.workspaces.activity()).to.deep.equal({
      linkedScreens: 1,
      activeAds: 1
    });

    // Files used by an ad can't be deleted; removing the screen and cancelling stop playback.
    try {
      await advertiser.assets.delete({ id: asset.id });
      expect.fail("expected PRECONDITION_FAILED");
    } catch (err) {
      expect((err as TRPCError).code).to.equal("PRECONDITION_FAILED");
    }
    await advertiser.ads.removeScreen({ id, screenId: own.id });
    expect((await events.next("rotation.updated")).rotation?.version).to.equal("default-1");
    await advertiser.ads.cancel({ id });
    expect((await advertiser.ads.get({ id })).status).to.equal("CANCELED");
    events.close();
  });

  it("lets an owner approve one screen, decline the other, stop it, and reuses approvals", async () => {
    const OWNER = `WO-owner-${stamp}`;
    const png = join(work, "desayuno.png");
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=1280x720",
      "-frames:v",
      "1",
      png
    ]);
    const uploaded = await upload(
      ADVERTISER,
      await readFile(png),
      "image/png",
      "durationMs=5000&name=Desayuno"
    );
    const { asset } = (await uploaded.json()) as { asset: AssetView };
    await services.media.queue.idle();

    const gym = await completeScreen(OWNER, "Gimnasio Norte");
    const clinic = await completeScreen(OWNER, "Clínica Luz");
    const device = await register(`hw-review-gym-${stamp}`);
    const owner = await dashboard(OWNER);
    await owner.screens.link({ screenId: gym.id, code: device.code });
    const events = await openEvents(device.deviceToken);
    await events.next("state");

    const advertiser = await dashboard(ADVERTISER);
    const today = localDateString(new Date(), "America/Santo_Domingo");
    const dates = { startDate: today, endDate: today };
    const { id } = await advertiser.ads.create({
      name: "Desayuno",
      assetId: asset.id,
      ...dates,
      screenIds: [gym.id, clinic.id]
    });

    // The owner sees one pending request with both screens, and approves only the gym.
    expect(await owner.adReview.pendingCount()).to.deep.equal({ count: 1 });
    const [request] = await owner.adReview.list({ tab: "PENDING" });
    expect(request!.screens.map((s) => [s.name, s.pending])).to.deep.equal([
      ["Clínica Luz", true],
      ["Gimnasio Norte", true]
    ]);
    await owner.adReview.approve({ adId: id, screenIds: [gym.id] });
    const approved = await events.next("rotation.updated");
    expect(approved.rotation?.items.map((i) => i.title)).to.deep.equal(["Desayuno"]);
    expect(await owner.adReview.pendingCount()).to.deep.equal({ count: 0 });

    let detail = await advertiser.ads.get({ id });
    expect(detail.status).to.equal("ON_AIR");
    expect(detail.adScreens.map((s) => [s.name, s.status, s.reasonCode])).to.deep.equal([
      ["Clínica Luz", "REJECTED", "NOT_SUITABLE_FOR_VENUE"],
      ["Gimnasio Norte", "ON_AIR", null]
    ]);

    // The owner stops it on the gym: the player drops it and the advertiser needs to act.
    await owner.adReview.revoke({ adId: id, screenId: gym.id, note: "Cambio de programación" });
    expect((await events.next("rotation.updated")).rotation?.version).to.equal("default-1");
    detail = await advertiser.ads.get({ id });
    expect(detail.status).to.equal("NEEDS_ATTENTION");
    expect(detail.adScreens.find((s) => s.name === "Gimnasio Norte")).to.deep.include({
      status: "REVOKED",
      note: "Cambio de programación"
    });
    expect((await owner.adReview.list({ tab: "REVIEWED" })).map((r) => r.adId)).to.include(id);

    // Re-adding the declined clinic asks again; once approved, a new ad with the same file on the
    // clinic starts approved without a request.
    await advertiser.ads.addScreens({ id, screenIds: [clinic.id] });
    expect(await owner.adReview.pendingCount()).to.deep.equal({ count: 1 });
    await owner.adReview.approve({ adId: id, screenIds: [clinic.id] });
    const second = await advertiser.ads.create({
      name: "Desayuno 2",
      assetId: asset.id,
      ...dates,
      screenIds: [clinic.id]
    });
    expect((await advertiser.ads.get({ id: second.id })).adScreens[0]!.status).to.equal("ON_AIR");
    expect(await owner.adReview.pendingCount()).to.deep.equal({ count: 0 });
    events.close();
  });
});

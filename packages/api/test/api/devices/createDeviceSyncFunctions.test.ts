/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError, type Manifest } from "@proyecta/common";
import { createRecordPlayLogs } from "../../../src/api/devices/createDeviceSyncFunctions.js";

const DEVICE_ID = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
const SCREEN_ID = "a1b2c3d4-1b2d-4c5e-9f00-112233445566";
const LINKED_AT = new Date("2026-09-01T00:00:00Z");
const PLACEMENT_ID = "c0ffee00-1b2d-4c5e-9f00-112233445566";

const rotation: Manifest = {
  version: "v1",
  name: "Rotación",
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

function play(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "cafe-aroma",
    codec: "webp",
    result: "completed",
    startedAt: "2026-09-14T12:00:00.000Z",
    endedAt: "2026-09-14T12:00:15.000Z",
    ...overrides
  };
}

function db() {
  return {
    deviceBinding: {
      findMany: sinon
        .stub()
        .resolves([{ screenId: SCREEN_ID, linkedAt: LINKED_AT, unlinkedAt: null }])
    },
    screen: {
      findMany: sinon.stub().resolves([{ id: SCREEN_ID, ratePerFiveSecondsCents: 250 }])
    },
    playLog: {
      createMany: sinon.stub().resolves({ count: 1 })
    }
  };
}

const deps = (client: ReturnType<typeof db>, loadRotation = sinon.stub().resolves(rotation)) => ({
  db: client as never,
  loadRotation
});

describe("createRecordPlayLogs", () => {
  afterEach(() => sinon.restore());

  it("should bill a completed play by the duration the device reports", async () => {
    // Arrange
    const client = db();
    const loadRotation = sinon.stub().resolves(rotation);

    // Act
    await createRecordPlayLogs(deps(client, loadRotation))({
      deviceId: DEVICE_ID,
      plays: [play({ durationMs: 15000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({ screenId: SCREEN_ID, billedUnits: 3, rateCentsAtPlay: 250 });
    expect(loadRotation.called).to.equal(false);
  });

  it("should fall back to the rotation lookup when the device omits the duration", async () => {
    // Arrange
    const client = db();

    // Act
    await createRecordPlayLogs(deps(client))({
      deviceId: DEVICE_ID,
      plays: [play()]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({ billedUnits: 2, rateCentsAtPlay: 250 });
  });

  it("should not bill a reported duration that isn't a multiple of 5000ms, without falling back", async () => {
    // Arrange
    const client = db();
    const loadRotation = sinon.stub().resolves(rotation);

    // Act
    await createRecordPlayLogs(deps(client, loadRotation))({
      deviceId: DEVICE_ID,
      plays: [play({ durationMs: 8000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row.billedUnits).to.equal(null);
    expect(loadRotation.called).to.equal(false);
  });

  it("should not bill stalled or failed plays", async () => {
    // Arrange
    const client = db();

    // Act
    await createRecordPlayLogs(deps(client))({
      deviceId: DEVICE_ID,
      plays: [play({ result: "stalled", durationMs: 15000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row.billedUnits).to.equal(null);
    expect(row.result).to.equal("STALLED");
  });

  it("should snapshot no rate for a screen that has none", async () => {
    // Arrange
    const client = db();
    client.screen.findMany.resolves([{ id: SCREEN_ID, ratePerFiveSecondsCents: null }]);

    // Act
    await createRecordPlayLogs(deps(client))({
      deviceId: DEVICE_ID,
      plays: [play({ durationMs: 15000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({ billedUnits: 3, rateCentsAtPlay: null });
  });

  it("should not bill an unattributed play (no screen link at the time)", async () => {
    // Arrange
    const client = db();
    client.deviceBinding.findMany.resolves([]);

    // Act
    await createRecordPlayLogs(deps(client))({
      deviceId: DEVICE_ID,
      plays: [play({ durationMs: 15000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({ screenId: null, rateCentsAtPlay: null, billedUnits: 3 });
  });

  it("should store an own ad on an own screen as a house play that isn't billed", async () => {
    // Arrange
    const client = db();
    client.screen.findMany.resolves([
      { id: SCREEN_ID, ratePerFiveSecondsCents: 250, workspaceAccessKeyId: "WO1" }
    ]);
    const adPlacement = {
      findMany: sinon
        .stub()
        .resolves([
          { id: PLACEMENT_ID, asset: { durationMs: 15000 }, ad: { workspaceAccessKeyId: "WO1" } }
        ])
    };

    // Act
    await createRecordPlayLogs(deps({ ...client, adPlacement } as never))({
      deviceId: DEVICE_ID,
      plays: [play({ itemId: PLACEMENT_ID, durationMs: 15000 })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({
      placementId: PLACEMENT_ID,
      advertiserWorkspaceAccessKeyId: "WO1",
      house: true,
      billedUnits: null,
      rateCentsAtPlay: null
    });
  });

  it("should bill another business's ad and fall back to the file duration", async () => {
    // Arrange
    const client = db();
    client.screen.findMany.resolves([
      { id: SCREEN_ID, ratePerFiveSecondsCents: 200, workspaceAccessKeyId: "WO1" }
    ]);
    const adPlacement = {
      findMany: sinon
        .stub()
        .resolves([
          { id: PLACEMENT_ID, asset: { durationMs: 10000 }, ad: { workspaceAccessKeyId: "WO2" } }
        ])
    };
    const loadRotation = sinon.stub().resolves(rotation);

    // Act
    await createRecordPlayLogs(deps({ ...client, adPlacement } as never, loadRotation))({
      deviceId: DEVICE_ID,
      plays: [play({ itemId: PLACEMENT_ID })]
    });

    // Assert
    const row = client.playLog.createMany.firstCall.args[0].data[0];
    expect(row).to.include({
      advertiserWorkspaceAccessKeyId: "WO2",
      house: false,
      billedUnits: 2,
      rateCentsAtPlay: 200
    });
    expect(loadRotation.called).to.equal(false);
  });

  it("should reject an empty batch", async () => {
    // Arrange
    const client = db();

    // Act + Assert
    try {
      await createRecordPlayLogs(deps(client))({ deviceId: DEVICE_ID, plays: [] });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(client.playLog.createMany.called).to.equal(false);
    }
  });
});

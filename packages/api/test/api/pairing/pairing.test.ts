/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createRecordPlayLogs } from "../../../src/api/devices/createDeviceSyncFunctions.js";
import {
  createCheckPairingCode,
  createLinkDevice
} from "../../../src/api/pairing/createPairingFunctions.js";
import { EventHub } from "../../../src/events/hub.js";
import { DomainError } from "../../../src/identity/errors.js";

const NOW = new Date("2026-09-14T12:00:00Z");
const SCREEN = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
const DEVICE = "0b1c2d3e-4f50-4a6b-8c7d-8e9fa0b1c2d3";

function deps(db: Record<string, unknown>, hub = new EventHub()) {
  return { db: db as never, hub, now: () => NOW, loadRotation: async () => null };
}

describe("pairing and play attribution", () => {
  afterEach(() => sinon.restore());

  describe("createCheckPairingCode", () => {
    function withDevice(device: unknown) {
      return { device: { findUnique: sinon.stub().resolves(device) } };
    }

    it("should report unknown, linked and offline codes with a reason", async () => {
      const check = (device: unknown) =>
        createCheckPairingCode(deps(withDevice(device)))({
          code: "8f3k-2qlm",
          workspaceAccessKeyId: "WO1"
        });

      expect(await check(null)).to.deep.equal({ available: false, reason: "NOT_FOUND" });
      expect(await check({ id: DEVICE, lastSeenAt: NOW, bindings: [{ id: "b" }] })).to.deep.equal({
        available: false,
        reason: "LINKED"
      });
      expect(
        await check({ id: DEVICE, lastSeenAt: new Date(NOW.getTime() - 3 * 60_000), bindings: [] })
      ).to.deep.equal({ available: false, reason: "OFFLINE" });
    });

    it("should accept the code typed in lowercase with a dash when the device is waiting", async () => {
      // Arrange
      const db = withDevice({ id: DEVICE, lastSeenAt: NOW, resolution: "1920x1080", bindings: [] });

      // Act
      const result = await createCheckPairingCode(deps(db))({
        code: "8f3k-2qlm",
        workspaceAccessKeyId: "WO1"
      });

      // Assert
      expect(result).to.deep.equal({ available: true, resolution: "1920x1080" });
      expect(db.device.findUnique.firstCall.args[0].where).to.deep.equal({ code: "8F3K2QLM" });
    });
  });

  describe("createLinkDevice", () => {
    it("should turn a lost race (unique violation) into a conflict", async () => {
      // Arrange
      const db = {
        device: {
          findUnique: sinon.stub().resolves({ id: DEVICE, lastSeenAt: NOW, resolution: null })
        },
        screen: {
          findFirst: sinon.stub().resolves({ id: SCREEN, status: "ACTIVE", resolution: null })
        },
        deviceBinding: {
          create: sinon.stub().rejects(Object.assign(new Error("unique"), { code: "P2002" }))
        }
      };
      const hub = new EventHub();
      const published = sinon.spy(hub, "publishToDevice");

      // Act + Assert
      try {
        await createLinkDevice(deps(db, hub))({
          screenId: SCREEN,
          code: "8F3K2QLM",
          workspaceAccessKeyId: "WO1"
        });
        expect.fail("expected CONFLICT");
      } catch (err) {
        expect((err as DomainError).code).to.equal("CONFLICT");
        expect(published.called).to.equal(false);
      }
    });

    it("should refuse archived screens", async () => {
      // Arrange
      const db = {
        device: { findUnique: sinon.stub().resolves({ id: DEVICE, lastSeenAt: NOW }) },
        screen: { findFirst: sinon.stub().resolves({ id: SCREEN, status: "ARCHIVED" }) },
        deviceBinding: { create: sinon.stub() }
      };

      // Act + Assert
      try {
        await createLinkDevice(deps(db))({
          screenId: SCREEN,
          code: "8F3K2QLM",
          workspaceAccessKeyId: "WO1"
        });
        expect.fail("expected PRECONDITION_FAILED");
      } catch (err) {
        expect((err as DomainError).code).to.equal("PRECONDITION_FAILED");
        expect(db.deviceBinding.create.called).to.equal(false);
      }
    });
  });

  describe("createRecordPlayLogs", () => {
    it("should attribute plays to the screen linked when each play started", async () => {
      // Arrange
      const moved = new Date("2026-09-14T11:00:00Z");
      const db = {
        deviceBinding: {
          findMany: sinon.stub().resolves([
            {
              screenId: "screen-before",
              linkedAt: new Date("2026-09-14T09:00:00Z"),
              unlinkedAt: moved
            },
            { screenId: "screen-after", linkedAt: moved, unlinkedAt: null }
          ])
        },
        playLog: { createMany: sinon.stub().resolves({ count: 3 }) }
      };
      const play = (startedAt: string) => ({
        itemId: "cafe-aroma",
        codec: "vp9",
        result: "completed" as const,
        startedAt,
        endedAt: startedAt
      });

      // Act
      await createRecordPlayLogs(deps(db))({
        deviceId: DEVICE,
        plays: [
          play("2026-09-14T10:59:59.000Z"),
          play("2026-09-14T11:00:00.000Z"),
          play("2026-09-14T08:00:00.000Z")
        ]
      });

      // Assert
      const { data, skipDuplicates } = db.playLog.createMany.firstCall.args[0];
      expect(data.map((d: { screenId: string | null }) => d.screenId)).to.deep.equal([
        "screen-before",
        "screen-after",
        null
      ]);
      expect(data[0].result).to.equal("COMPLETED");
      expect(skipDuplicates).to.equal(true);
    });
  });
});

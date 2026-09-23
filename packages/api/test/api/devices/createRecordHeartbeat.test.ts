/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import { createRecordHeartbeat } from "../../../src/api/devices/createDeviceSyncFunctions.js";

const DEVICE_ID = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
const AT = new Date("2026-09-23T12:00:00Z");

function setup() {
  const update = sinon.stub().resolves({ bindings: [] });
  const publishToWorkspace = sinon.stub();
  const recordHeartbeat = createRecordHeartbeat({
    db: { device: { update } } as never,
    hub: { publishToWorkspace } as never,
    loadRotation: sinon.stub() as never,
    now: () => AT
  });
  const storedHealth = () => update.firstCall.args[0].data.health as Record<string, unknown>;
  return { update, recordHeartbeat, storedHealth };
}

describe("createRecordHeartbeat", () => {
  it("should keep RAM figures reported by a native shell", async () => {
    // Arrange
    const { recordHeartbeat, storedHealth } = setup();

    // Act
    await recordHeartbeat({
      deviceId: DEVICE_ID,
      playerVersion: "0.9.0",
      uptimeSec: 60,
      shellVersion: "0.9.0",
      deviceModel: "Mi Box S",
      memoryUsedMb: 900,
      memoryTotalMb: 1900
    });

    // Assert
    expect(storedHealth()).to.include({
      memoryUsedMb: 900,
      memoryTotalMb: 1900,
      deviceModel: "Mi Box S"
    });
  });

  it("should drop RAM figures from a heartbeat without a shell version", async () => {
    // Arrange
    const { recordHeartbeat, storedHealth } = setup();

    // Act
    const result = await recordHeartbeat({
      deviceId: DEVICE_ID,
      playerVersion: "0.8.1",
      uptimeSec: 60,
      memoryUsedMb: 40,
      memoryTotalMb: 4096,
      storageUsedMb: 12
    });

    // Assert
    expect(result).to.deep.equal({ ok: true });
    expect(storedHealth()).to.not.have.any.keys("memoryUsedMb", "memoryTotalMb");
    expect(storedHealth()).to.include({ storageUsedMb: 12 });
  });

  it("should reject an invalid heartbeat without storing it", async () => {
    // Arrange
    const { update, recordHeartbeat } = setup();

    // Act + Assert
    try {
      await recordHeartbeat({
        deviceId: DEVICE_ID,
        playerVersion: "0.9.0",
        uptimeSec: 60,
        cpuScope: "gpu" as never
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(update.called).to.equal(false);
    }
  });
});

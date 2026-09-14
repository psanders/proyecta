/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError, type Device } from "@proyecta/common";
import { createRegisterDevice } from "../../../src/api/devices/createRegisterDevice.js";
import { hashDeviceToken } from "../../../src/api/devices/deviceToken.js";

function device(overrides: Partial<Device> = {}): Device {
  const at = new Date("2026-09-14T12:00:00Z");
  return {
    id: "device-1",
    code: "8F3K2QLM",
    hwId: "android-1234567890",
    shell: "ANDROID",
    chromiumVersion: "130.0.6723.0",
    resolution: "1920x1080",
    lastSeenAt: at,
    createdAt: at,
    updatedAt: at,
    ...overrides
  };
}

function stubClient() {
  return {
    device: {
      findUnique: sinon.stub(),
      update: sinon.stub(),
      create: sinon.stub()
    }
  };
}

describe("createRegisterDevice", () => {
  const validInput = { hwId: "android-1234567890", shell: "ANDROID", resolution: "1920x1080" };

  afterEach(() => {
    sinon.restore();
  });

  describe("with a new hardware id", () => {
    it("should mint a code and create the device", async () => {
      // Arrange
      const client = stubClient();
      client.device.findUnique.resolves(null);
      client.device.create.resolves(device());

      // Act
      const registerDevice = createRegisterDevice({
        client,
        generateCode: () => "8F3K2QLM",
        generateToken: () => "tok-1"
      });
      const result = await registerDevice(validInput);

      // Assert
      expect(result).to.deep.equal({ code: "8F3K2QLM", deviceToken: "tok-1", created: true });
      expect(client.device.create.firstCall.args[0].data.tokenHash).to.equal(
        hashDeviceToken("tok-1")
      );
    });

    it("should retry with a new code when the code collides", async () => {
      // Arrange
      const client = stubClient();
      client.device.findUnique.resolves(null);
      client.device.create
        .onFirstCall()
        .rejects(Object.assign(new Error("unique"), { code: "P2002" }));
      client.device.create.onSecondCall().resolves(device({ code: "ZZZZ2222" }));
      const codes = ["8F3K2QLM", "ZZZZ2222"];

      // Act
      const registerDevice = createRegisterDevice({
        client,
        generateCode: () => codes.shift()!,
        generateToken: () => "tok-2"
      });
      const result = await registerDevice(validInput);

      // Assert
      expect(result).to.deep.equal({ code: "ZZZZ2222", deviceToken: "tok-2", created: true });
      expect(client.device.create.calledTwice).to.equal(true);
    });
  });

  describe("with a known hardware id", () => {
    it("should return the same code and never create a new device", async () => {
      // Arrange
      const client = stubClient();
      client.device.findUnique.resolves(device());
      client.device.update.resolves(device());

      // Act
      const registerDevice = createRegisterDevice({ client, generateToken: () => "tok-3" });
      const result = await registerDevice(validInput);

      // Assert
      expect(result).to.deep.equal({ code: "8F3K2QLM", deviceToken: "tok-3", created: false });
      expect(client.device.update.firstCall.args[0].data.tokenHash).to.equal(
        hashDeviceToken("tok-3")
      );
      expect(client.device.create.called).to.equal(false);
      expect(client.device.update.calledOnce).to.equal(true);
    });
  });

  describe("with invalid input", () => {
    it("should throw ValidationError when the hardware id is missing", async () => {
      // Arrange
      const client = stubClient();
      const registerDevice = createRegisterDevice({ client });

      // Act + Assert
      try {
        await registerDevice({ shell: "ANDROID" });
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(client.device.findUnique.called).to.equal(false);
        expect(client.device.create.called).to.equal(false);
      }
    });
  });
});

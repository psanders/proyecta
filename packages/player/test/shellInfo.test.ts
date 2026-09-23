/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { healthFigures, resolveShell, type ShellBridge } from "../src/shellInfo.js";

const GB = 1024 * 1_048_576;

function androidBridge(overrides: Partial<ShellBridge> = {}): ShellBridge {
  return {
    hardwareId: () => "a1b2c3d4e5f60718",
    shell: () => "ANDROID",
    version: () => "0.9.0",
    info: () => JSON.stringify({ deviceModel: "Mi Box S", osVersion: "Android 9", cpuCores: 4 }),
    metrics: () =>
      JSON.stringify({
        memoryUsedMb: 900,
        memoryTotalMb: 1900,
        cpuPercent: 7,
        cpuScope: "process"
      }),
    ...overrides
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

describe("resolveShell", () => {
  it("should prefer the Android bridge and read its metrics", async () => {
    // Arrange
    const fetchFn = sinon.stub();

    // Act
    const context = await resolveShell({ bridge: androidBridge(), fetchFn });

    // Assert
    expect(context.shell).to.equal("ANDROID");
    expect(context.info).to.include({
      version: "0.9.0",
      hwId: "a1b2c3d4e5f60718",
      deviceModel: "Mi Box S"
    });
    expect(await context.metrics()).to.include({ memoryTotalMb: 1900, cpuScope: "process" });
    expect(fetchFn.called).to.equal(false);
  });

  it("should use the kiosk helper when there is no bridge", async () => {
    // Arrange
    const fetchFn = sinon.stub();
    fetchFn
      .withArgs("/shell/info")
      .resolves(
        jsonResponse({ shell: "KIOSK_LINUX", version: "0.9.0", hwId: "machine-id", cpuCores: 8 })
      );
    fetchFn.withArgs("/shell/metrics").resolves(
      jsonResponse({
        cpuPercent: 31,
        cpuScope: "system",
        diskUsedMb: 20_000,
        diskTotalMb: 120_000
      })
    );

    // Act
    const context = await resolveShell({ fetchFn });

    // Assert
    expect(context.shell).to.equal("KIOSK_LINUX");
    expect(await context.metrics()).to.include({ cpuScope: "system", diskTotalMb: 120_000 });
  });

  it("should fall back to a plain browser when no shell answers", async () => {
    // Arrange
    const fetchFn = sinon.stub().rejects(new TypeError("Failed to fetch"));

    // Act
    const context = await resolveShell({ fetchFn });

    // Assert
    expect(context.shell).to.equal("BROWSER");
    expect(context.info).to.equal(undefined);
    expect(await context.metrics()).to.equal(undefined);
  });

  it("should ignore a bridge that reports invalid info", async () => {
    // Arrange
    const bridge = androidBridge({ shell: () => "BROWSER" });

    // Act
    const context = await resolveShell({ bridge });

    // Assert
    expect(context.shell).to.equal("BROWSER");
  });

  it("should drop invalid metrics instead of reporting them", async () => {
    // Arrange
    const bridge = androidBridge({ metrics: () => JSON.stringify({ cpuPercent: 250 }) });

    // Act
    const context = await resolveShell({ bridge });

    // Assert
    expect(await context.metrics()).to.equal(undefined);
  });
});

describe("healthFigures", () => {
  const probe = {
    hardwareConcurrency: 4,
    deviceMemory: 2,
    jsHeapUsedBytes: 35 * 1_048_576,
    storage: { usage: 300 * 1_048_576, quota: 6 * GB }
  };

  it("should report device RAM, disk and CPU only from a shell", async () => {
    // Arrange
    const context = await resolveShell({ bridge: androidBridge() });

    // Act
    const figures = await healthFigures(context, probe);

    // Assert
    expect(figures).to.include({
      shellVersion: "0.9.0",
      deviceModel: "Mi Box S",
      cpuCores: 4,
      memoryUsedMb: 900,
      memoryTotalMb: 1900,
      jsHeapUsedMb: 35
    });
    expect(figures.deviceMemoryApproxGb).to.equal(undefined);
  });

  it("should never report the JS heap as RAM in a plain browser", async () => {
    // Arrange
    const context = await resolveShell();

    // Act
    const figures = await healthFigures(context, probe);

    // Assert
    expect(figures).to.include({
      cpuCores: 4,
      deviceMemoryApproxGb: 2,
      jsHeapUsedMb: 35,
      storageUsedMb: 300,
      storageQuotaMb: 6144
    });
    expect(figures).to.not.have.any.keys("memoryUsedMb", "memoryTotalMb", "shellVersion");
  });
});

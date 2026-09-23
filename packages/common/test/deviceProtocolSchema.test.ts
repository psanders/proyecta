/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { heartbeatSchema, shellInfoSchema, shellMetricsSchema } from "../src/index.js";

describe("heartbeatSchema", () => {
  it("should accept a heartbeat from a player that predates the shell fields", () => {
    // Arrange
    const legacy = {
      playerVersion: "0.8.1",
      uptimeSec: 120,
      memoryUsedMb: 40,
      memoryTotalMb: 4096
    };

    // Act
    const result = heartbeatSchema.safeParse(legacy);

    // Assert
    expect(result.success).to.equal(true);
  });

  it("should accept the shell figures", () => {
    // Arrange
    const heartbeat = {
      playerVersion: "0.9.0",
      uptimeSec: 60,
      shellVersion: "0.9.0",
      deviceModel: "X96 Max+",
      osVersion: "Android 9",
      cpuCores: 4,
      cpuPercent: 12.5,
      cpuScope: "process",
      memoryUsedMb: 900,
      memoryTotalMb: 1900,
      diskUsedMb: 3000,
      diskTotalMb: 14000,
      jsHeapUsedMb: 35
    };

    // Act
    const result = heartbeatSchema.safeParse(heartbeat);

    // Assert
    expect(result.success).to.equal(true);
  });

  it("should reject invalid figures", () => {
    // Arrange
    const heartbeat = { playerVersion: "0.9.0", uptimeSec: 60, cpuCores: 0, cpuScope: "gpu" };

    // Act
    const result = heartbeatSchema.safeParse(heartbeat);

    // Assert
    expect(result.success).to.equal(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).to.include.members(["cpuCores", "cpuScope"]);
  });
});

describe("shellInfoSchema", () => {
  it("should accept what the Android bridge reports", () => {
    // Arrange
    const info = { shell: "ANDROID", version: "0.9.0", deviceModel: "Mi Box S", cpuCores: 4 };

    // Act
    const result = shellInfoSchema.safeParse(info);

    // Assert
    expect(result.success).to.equal(true);
  });

  it("should reject BROWSER, which is never a shell's own type", () => {
    // Arrange
    const info = { shell: "BROWSER", version: "0.9.0" };

    // Act
    const result = shellInfoSchema.safeParse(info);

    // Assert
    expect(result.success).to.equal(false);
  });
});

describe("shellMetricsSchema", () => {
  it("should reject a CPU load above 100", () => {
    // Arrange
    const metrics = { cpuPercent: 140, cpuScope: "system" };

    // Act
    const result = shellMetricsSchema.safeParse(metrics);

    // Assert
    expect(result.success).to.equal(false);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { createDbClient, type DbClient } from "../../src/db.js";
import { createRegisterDevice } from "../../src/api/devices/createRegisterDevice.js";
import { testConfig } from "./testConfig.js";

describe("registerDevice (integration, Postgres)", () => {
  let client: DbClient;

  before(async () => {
    client = createDbClient(testConfig().databaseUrl);
  });

  after(async () => {
    await client.$disconnect();
  });

  it("should give the same hardware id the same code, even when registering concurrently", async () => {
    // Arrange
    const registerDevice = createRegisterDevice({ client });
    const input = { hwId: `machine-id-integration-${Date.now()}`, shell: "KIOSK_LINUX" };

    // Act
    const results = await Promise.all([registerDevice(input), registerDevice(input)]);
    const again = await registerDevice(input);

    // Assert
    expect(results[0]!.code).to.equal(results[1]!.code);
    expect(again).to.include({ code: results[0]!.code, created: false });
    expect(await client.device.count({ where: { hwId: input.hwId } })).to.equal(1);
  });
});

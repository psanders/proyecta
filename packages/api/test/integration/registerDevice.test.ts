/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { createDbClient, type DbClient } from "../../src/db.js";
import { createRegisterDevice } from "../../src/api/devices/createRegisterDevice.js";

describe("registerDevice (integration, Postgres)", () => {
  let client: DbClient;

  before(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
    client = createDbClient(url);
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

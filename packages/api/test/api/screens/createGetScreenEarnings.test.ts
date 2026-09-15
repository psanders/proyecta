/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createGetScreenEarnings } from "../../../src/api/screens/createGetScreenEarnings.js";
import { DomainError } from "../../../src/identity/errors.js";

const ID = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
// Fixed instant so "today"/"last 7 days" windows are deterministic in the test.
const NOW = new Date("2026-09-14T18:00:00Z"); // 2026-09-14 14:00 America/Santo_Domingo (UTC-4)

function db() {
  return {
    screen: { findFirst: sinon.stub() },
    playLog: { findMany: sinon.stub() }
  };
}

const deps = (client: ReturnType<typeof db>) => ({ db: client as never, now: () => NOW });

describe("createGetScreenEarnings", () => {
  afterEach(() => sinon.restore());

  it("should report unavailable when the screen has no rate", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves({ ratePerFiveSecondsCents: null });

    // Act
    const result = await createGetScreenEarnings(deps(client))({
      id: ID,
      workspaceAccessKeyId: "WO1"
    });

    // Assert
    expect(result).to.deep.equal({ available: false });
    expect(client.playLog.findMany.called).to.equal(false);
  });

  it("should sum billable plays, seconds and earnings for today and the last 7 days", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves({ ratePerFiveSecondsCents: 250 });
    client.playLog.findMany
      .onFirstCall()
      .resolves([
        { billedUnits: 3, rateCentsAtPlay: 250 },
        { billedUnits: 2, rateCentsAtPlay: 250 }
      ])
      .onSecondCall()
      .resolves([
        { billedUnits: 3, rateCentsAtPlay: 250 },
        { billedUnits: 2, rateCentsAtPlay: 250 },
        { billedUnits: 1, rateCentsAtPlay: 200 }
      ]);

    // Act
    const result = await createGetScreenEarnings(deps(client))({
      id: ID,
      workspaceAccessKeyId: "WO1"
    });

    // Assert
    expect(result).to.deep.equal({
      available: true,
      today: { plays: 2, billableSeconds: 25, earningsCents: 1250 },
      last7Days: { plays: 3, billableSeconds: 30, earningsCents: 1450 }
    });
  });

  it("should scope the today window to the America/Santo_Domingo calendar day", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves({ ratePerFiveSecondsCents: 250 });
    client.playLog.findMany.resolves([]);

    // Act
    await createGetScreenEarnings(deps(client))({ id: ID, workspaceAccessKeyId: "WO1" });

    // Assert: local midnight for 2026-09-14 in UTC-4 is 2026-09-14T04:00:00Z.
    const todayWhere = client.playLog.findMany.firstCall.args[0].where;
    expect(todayWhere.startedAt.gte.toISOString()).to.equal("2026-09-14T04:00:00.000Z");
    expect(todayWhere.startedAt.lt.toISOString()).to.equal("2026-09-15T04:00:00.000Z");
  });

  it("should reject a screen that doesn't belong to the workspace", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(null);

    // Act + Assert
    try {
      await createGetScreenEarnings(deps(client))({ id: ID, workspaceAccessKeyId: "WO2" });
      expect.fail("expected DomainError");
    } catch (err) {
      expect(err).to.be.instanceOf(DomainError);
      expect((err as DomainError).code).to.equal("NOT_FOUND");
    }
  });
});

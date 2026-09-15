/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createAdScheduleSweeper } from "../../../src/events/createAdScheduleSweeper.js";
import { createNotifyScreens } from "../../../src/events/createNotifyScreens.js";
import { EventHub } from "../../../src/events/hub.js";

describe("ad schedule events", () => {
  afterEach(() => sinon.restore());

  it("should push a rotation update to the players linked to changed screens", async () => {
    // Arrange
    const hub = new EventHub();
    const received: string[] = [];
    hub.subscribeDevice("d1", (event) => received.push(event.type));
    const rotation = { version: "screen-1", items: [] };
    const db = {
      deviceBinding: {
        findMany: sinon.stub().resolves([{ deviceId: "d1" }]),
        findFirst: sinon
          .stub()
          .resolves({ screen: { id: "s1", name: "Farmacia", resolution: null } })
      }
    };
    const notify = createNotifyScreens({
      db: db as never,
      hub,
      loadRotation: sinon.stub().resolves(null),
      loadScreenRotation: sinon.stub().resolves(rotation)
    });

    // Act
    await notify(["s1", "s1"]);

    // Assert
    expect(received).to.deep.equal(["rotation.updated"]);
    expect(db.deviceBinding.findMany.firstCall.args[0].where).to.deep.equal({
      screenId: { in: ["s1"] },
      unlinkedAt: null
    });
  });

  it("should notify the screens of ads that started or ended since the last sweep", async () => {
    // Arrange
    let now = new Date("2026-06-10T03:59:00Z");
    const db = {
      ad: {
        findMany: sinon.stub().resolves([{ placements: [{ screenId: "s1" }, { screenId: "s2" }] }])
      }
    };
    const notifyScreens = sinon.stub().resolves();
    const sweeper = createAdScheduleSweeper({ db: db as never, notifyScreens, now: () => now });
    sweeper.stop();
    now = new Date("2026-06-10T04:00:30Z");

    // Act
    await sweeper.sweep();

    // Assert
    const where = db.ad.findMany.firstCall.args[0].where;
    expect(where.OR[0].startsAt.gt.toISOString()).to.equal("2026-06-10T03:59:00.000Z");
    expect(where.OR[0].startsAt.lte.toISOString()).to.equal("2026-06-10T04:00:30.000Z");
    expect(notifyScreens.firstCall.args[0]).to.deep.equal(["s1", "s2"]);
  });
});

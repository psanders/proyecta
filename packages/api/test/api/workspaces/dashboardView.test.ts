/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createCreateWorkspace,
  createGetWorkspaceActivity,
  createSetDashboardView
} from "../../../src/api/workspaces/index.js";

const NOW = new Date("2026-09-14T12:00:00Z");

function stubs() {
  return {
    identity: {
      createWorkspace: sinon.stub().resolves({ ref: "ws-2" }),
      getWorkspace: sinon.stub().resolves({ ref: "ws-2", accessKeyId: "WO2", name: "Café Aroma" })
    },
    db: {
      workspaceSettings: { upsert: sinon.stub().resolves({}) },
      deviceBinding: { count: sinon.stub().resolves(3) },
      ad: { count: sinon.stub().resolves(1) }
    }
  };
}

describe("dashboard view functions", () => {
  afterEach(() => sinon.restore());

  it("should save the view for the business", async () => {
    // Arrange
    const { db } = stubs();

    // Act
    const result = await createSetDashboardView({ db: db as never })({
      workspaceAccessKeyId: "WO1",
      dashboardView: "ADVERTISER"
    });

    // Assert
    expect(result).to.deep.equal({ saved: true });
    expect(db.workspaceSettings.upsert.firstCall.args[0]).to.deep.equal({
      where: { workspaceAccessKeyId: "WO1" },
      create: { workspaceAccessKeyId: "WO1", dashboardView: "ADVERTISER" },
      update: { dashboardView: "ADVERTISER" }
    });
  });

  it("should reject an unknown view without saving", async () => {
    // Arrange
    const { db } = stubs();

    // Act + Assert
    try {
      await createSetDashboardView({ db: db as never })({
        workspaceAccessKeyId: "WO1",
        dashboardView: "VALLERO"
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(db.workspaceSettings.upsert.called).to.equal(false);
    }
  });

  it("should store the chosen view when creating a business", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act
    await createCreateWorkspace({ identity, db: db as never })({
      name: "Café Aroma",
      dashboardView: "BOTH",
      token: "t"
    });

    // Assert
    expect(identity.getWorkspace.firstCall.args).to.deep.equal(["ws-2", "t"]);
    expect(db.workspaceSettings.upsert.firstCall.args[0].create).to.deep.equal({
      workspaceAccessKeyId: "WO2",
      dashboardView: "BOTH"
    });
  });

  it("should not touch settings when a business is created without a view", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act
    await createCreateWorkspace({ identity, db: db as never })({ name: "Vallas", token: "t" });

    // Assert
    expect(db.workspaceSettings.upsert.called).to.equal(false);
  });

  it("should count linked screens and ads on air or scheduled", async () => {
    // Arrange
    const { db } = stubs();

    // Act
    const activity = await createGetWorkspaceActivity({ db: db as never, now: () => NOW })({
      workspaceAccessKeyId: "WO1"
    });

    // Assert
    expect(activity).to.deep.equal({ linkedScreens: 3, activeAds: 1 });
    expect(db.ad.count.firstCall.args[0].where).to.deep.include({
      workspaceAccessKeyId: "WO1",
      state: "SUBMITTED",
      endsAt: { gt: NOW }
    });
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createDeleteWorkspace,
  createGetWorkspaceSettings,
  createUpdateWorkspaceSettings
} from "../../../src/api/workspaces/index.js";
import { DomainError } from "../../../src/identity/errors.js";

const NOW = new Date("2026-09-14T12:00:00Z");
const caller = { workspaceAccessKeyId: "WO1", role: "WORKSPACE_OWNER", token: "t" };

function stubs() {
  return {
    identity: {
      listWorkspaces: sinon.stub().resolves({
        items: [{ ref: "ws-1", accessKeyId: "WO1", name: "Vallas del Cibao", ownerRef: "u1" }]
      }),
      updateWorkspace: sinon.stub().resolves({ ref: "ws-1" }),
      deleteWorkspace: sinon.stub().resolves({ ref: "ws-1" }),
      createWorkspace: sinon.stub().resolves({ ref: "ws-2" })
    },
    db: {
      workspaceSettings: {
        findUnique: sinon.stub().resolves(null),
        upsert: sinon.stub().resolves({})
      },
      deviceBinding: { count: sinon.stub().resolves(0) },
      screen: { updateMany: sinon.stub().resolves({ count: 2 }) }
    }
  };
}

describe("workspace settings functions", () => {
  afterEach(() => sinon.restore());

  it("should read the name from Identity, default the time zone and fix the currency", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act
    const view = await createGetWorkspaceSettings({ identity, db: db as never })({
      ...caller,
      role: "WORKSPACE_MEMBER"
    });

    // Assert
    expect(view).to.deep.equal({
      name: "Vallas del Cibao",
      timezone: "America/Santo_Domingo",
      currency: "USD",
      canEdit: false,
      isOwner: false
    });
  });

  it("should rename only when the name changed and upsert the time zone", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act
    await createUpdateWorkspaceSettings({ identity, db: db as never })({
      ...caller,
      name: "Vallas del Cibao",
      timezone: "America/New_York"
    });

    // Assert
    expect(identity.updateWorkspace.called).to.equal(false);
    expect(db.workspaceSettings.upsert.firstCall.args[0].update).to.deep.equal({
      timezone: "America/New_York"
    });
  });

  it("should reject a time zone outside the list", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act + Assert
    try {
      await createUpdateWorkspaceSettings({ identity, db: db as never })({
        ...caller,
        name: "Vallas",
        timezone: "Mars/Olympus"
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(db.workspaceSettings.upsert.called).to.equal(false);
    }
  });

  it("should refuse to delete while players are linked", async () => {
    // Arrange
    const { identity, db } = stubs();
    db.deviceBinding.count.resolves(1);

    // Act + Assert
    try {
      await createDeleteWorkspace({ identity, db: db as never, now: () => NOW })({
        ...caller,
        confirmation: "ELIMINAR"
      });
      expect.fail("expected DomainError");
    } catch (err) {
      expect((err as DomainError).code).to.equal("PRECONDITION_FAILED");
      expect(db.screen.updateMany.called).to.equal(false);
      expect(identity.deleteWorkspace.called).to.equal(false);
    }
  });

  it("should soft-delete screens and delete the Identity workspace", async () => {
    // Arrange
    const { identity, db } = stubs();

    // Act
    await createDeleteWorkspace({ identity, db: db as never, now: () => NOW })({
      ...caller,
      confirmation: "eliminar"
    });

    // Assert
    expect(db.screen.updateMany.firstCall.args[0]).to.deep.equal({
      where: { workspaceAccessKeyId: "WO1", deletedAt: null },
      data: { deletedAt: NOW }
    });
    expect(identity.deleteWorkspace.calledWith("ws-1", "t")).to.equal(true);
  });
});

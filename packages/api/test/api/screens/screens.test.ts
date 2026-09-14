/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createCreateScreen,
  createListScreens,
  createRetireScreen,
  createUpdateScreen
} from "../../../src/api/screens/createScreenFunctions.js";
import { EventHub } from "../../../src/events/hub.js";
import { DomainError } from "../../../src/identity/errors.js";

const NOW = new Date("2026-09-14T12:00:00Z");
const ID = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    workspaceAccessKeyId: "WO1",
    name: "Valla Av. 27 de Febrero",
    placeType: "BILLBOARD",
    environment: "OUTDOOR",
    city: "Santo Domingo",
    address: null,
    widthCm: null,
    heightCm: null,
    orientation: null,
    resolution: null,
    availableDays: [] as number[],
    startTime: null,
    endTime: null,
    priceReference: null,
    priceModel: null,
    status: "ACTIVE",
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    bindings: [] as unknown[],
    ...overrides
  };
}

function db() {
  return {
    screen: {
      create: sinon.stub(),
      update: sinon.stub(),
      findFirst: sinon.stub(),
      findMany: sinon.stub()
    }
  };
}

const deps = (client: ReturnType<typeof db>) => ({
  db: client as never,
  hub: new EventHub(),
  now: () => NOW
});

async function expectDomain(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`expected ${code}`);
  } catch (err) {
    expect(err).to.be.instanceOf(DomainError);
    expect((err as DomainError).code).to.equal(code);
  }
}

describe("screen functions", () => {
  afterEach(() => sinon.restore());

  it("should create a screen scoped to the workspace, unlinked and incomplete", async () => {
    // Arrange
    const client = db();
    client.screen.create.resolves(row());

    // Act
    const view = await createCreateScreen(deps(client))({
      workspaceAccessKeyId: "WO1",
      name: "  Valla Av. 27 de Febrero ",
      city: "Santo Domingo",
      placeType: "BILLBOARD"
    });

    // Assert
    expect(client.screen.create.firstCall.args[0].data).to.include({
      workspaceAccessKeyId: "WO1",
      name: "Valla Av. 27 de Febrero"
    });
    expect(view).to.include({ status: "UNLINKED", complete: false, archived: false });
  });

  it("should reject an end time before the start time", async () => {
    // Arrange
    const client = db();

    // Act + Assert
    try {
      await createCreateScreen(deps(client))({
        workspaceAccessKeyId: "WO1",
        name: "A",
        city: "Santiago",
        startTime: "20:00",
        endTime: "08:00"
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect((err as ValidationError).fieldErrors[0]).to.include({
        field: "endTime",
        message: "La hora de fin debe ser después de la de inicio"
      });
      expect(client.screen.create.called).to.equal(false);
    }
  });

  it("should not find screens of another workspace", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(null);

    // Act + Assert
    await expectDomain(
      createUpdateScreen(deps(client))({
        id: ID,
        workspaceAccessKeyId: "WO2",
        name: "X",
        city: "Santiago"
      }),
      "NOT_FOUND"
    );
    expect(client.screen.findFirst.firstCall.args[0].where).to.deep.equal({
      id: ID,
      workspaceAccessKeyId: "WO2",
      deletedAt: null
    });
  });

  it("should list active screens with totals, excluding archived ones", async () => {
    // Arrange
    const client = db();
    const complete = {
      availableDays: [1, 2, 3],
      startTime: "08:00",
      endTime: "20:00",
      priceReference: 2500,
      priceModel: "PER_HOUR"
    };
    client.screen.findMany.resolves([
      row({ id: "a", ...complete }),
      row({ id: "b" }),
      row({ id: "c", status: "ARCHIVED" })
    ]);

    // Act
    const list = await createListScreens(deps(client))({ workspaceAccessKeyId: "WO1" });

    // Assert
    expect(list.screens.map((s) => s.id)).to.deep.equal(["a", "b"]);
    expect(list.totals).to.deep.equal({ all: 2, online: 0, incomplete: 1 });
  });

  it("should refuse to archive or delete a screen with a linked device", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(
      row({ bindings: [{ id: "b1", linkedAt: NOW, device: { id: "d1", lastSeenAt: NOW } }] })
    );

    // Act + Assert
    await expectDomain(
      createRetireScreen(deps(client), "archive")({ id: ID, workspaceAccessKeyId: "WO1" }),
      "PRECONDITION_FAILED"
    );
    await expectDomain(
      createRetireScreen(deps(client), "delete")({ id: ID, workspaceAccessKeyId: "WO1" }),
      "PRECONDITION_FAILED"
    );
    expect(client.screen.update.called).to.equal(false);
  });

  it("should soft-delete an unlinked screen", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(row());
    client.screen.update.resolves(row());

    // Act
    await createRetireScreen(deps(client), "delete")({ id: ID, workspaceAccessKeyId: "WO1" });

    // Assert
    expect(client.screen.update.firstCall.args[0]).to.deep.equal({
      where: { id: ID },
      data: { deletedAt: NOW }
    });
  });
});

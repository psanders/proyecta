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
    description: null,
    latitude: null,
    longitude: null,
    tags: [] as string[],
    widthCm: null,
    heightCm: null,
    orientation: null,
    resolution: null,
    availableDays: [] as number[],
    startTime: null,
    endTime: null,
    ratePerFiveSecondsCents: null,
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

  it("should store description, coordinates, tags and a normalized resolution", async () => {
    // Arrange
    const client = db();
    client.screen.create.resolves(
      row({
        description: "Frente al semáforo",
        latitude: 18.4861,
        longitude: -69.9312,
        tags: ["tourists", "retired-tag"],
        orientation: "PORTRAIT",
        resolution: "1920x1080",
        availableDays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "20:00",
        ratePerFiveSecondsCents: 25
      })
    );

    // Act
    const view = await createCreateScreen(deps(client))({
      workspaceAccessKeyId: "WO1",
      name: "A",
      city: "Santo Domingo",
      description: " Frente al semáforo ",
      latitude: 18.4861,
      longitude: -69.9312,
      tags: ["tourists", "tourists"],
      orientation: "PORTRAIT",
      resolution: "1080x1920"
    });

    // Assert
    expect(client.screen.create.firstCall.args[0].data).to.deep.include({
      description: "Frente al semáforo",
      latitude: 18.4861,
      longitude: -69.9312,
      tags: ["tourists"],
      resolution: "1920x1080"
    });
    expect(view).to.deep.include({
      complete: true,
      tags: ["tourists"],
      resolutionTier: "FULL_HD",
      aspectRatio: "9:16"
    });
  });

  it("should reject coordinates outside the Dominican Republic before writing", async () => {
    // Arrange
    const client = db();

    // Act + Assert
    try {
      await createCreateScreen(deps(client))({
        workspaceAccessKeyId: "WO1",
        name: "A",
        city: "Santiago",
        latitude: 40.7128,
        longitude: -74.006
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect((err as ValidationError).fieldErrors[0]).to.include({
        field: "latitude",
        message: "Las coordenadas quedan fuera de República Dominicana"
      });
      expect(client.screen.create.called).to.equal(false);
    }
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

  it("should convert a fractional pay-per-display rate into exact cents", async () => {
    // Arrange
    const client = db();
    client.screen.create.resolves(row({ ratePerFiveSecondsCents: 250 }));

    // Act
    const view = await createCreateScreen(deps(client))({
      workspaceAccessKeyId: "WO1",
      name: "A",
      city: "Santiago",
      ratePerFiveSecondsDollars: 2.5
    });

    // Assert
    expect(client.screen.create.firstCall.args[0].data).to.include({
      ratePerFiveSecondsCents: 250
    });
    expect(view.ratePerFiveSecondsCents).to.equal(250);
  });

  it("should reject a rate with more than two decimal places", async () => {
    // Arrange
    const client = db();

    // Act + Assert
    try {
      await createCreateScreen(deps(client))({
        workspaceAccessKeyId: "WO1",
        name: "A",
        city: "Santiago",
        ratePerFiveSecondsDollars: 2.505
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect((err as ValidationError).fieldErrors[0]).to.include({
        field: "ratePerFiveSecondsDollars",
        message: "Usa como máximo dos decimales"
      });
      expect(client.screen.create.called).to.equal(false);
    }
  });

  it("should null out optional fields left off an update, but leave resolution untouched", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(row({ resolution: "50000x2000" }));
    client.screen.update.resolves(row({ resolution: "50000x2000" }));

    // Act
    await createUpdateScreen(deps(client))({
      id: ID,
      workspaceAccessKeyId: "WO1",
      name: "Renamed",
      city: "Santo Domingo"
      // No `resolution` in the input, as the dashboard sends when the field wasn't touched.
    });

    // Assert: every other optional field is nulled when absent, but resolution is left out of the
    // write entirely — a screen already carrying a resolution outside the new bounds (from before
    // they existed) keeps it instead of being nulled by an unrelated edit.
    const data = client.screen.update.firstCall.args[0].data;
    expect(data).to.include({ address: null, description: null, orientation: null });
    expect(data).to.not.have.property("resolution");
  });

  it("should write a resolution the caller actually sent, in bounds", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(row());
    client.screen.update.resolves(row({ resolution: "1920x1080" }));

    // Act
    await createUpdateScreen(deps(client))({
      id: ID,
      workspaceAccessKeyId: "WO1",
      name: "Renamed",
      city: "Santo Domingo",
      resolution: "1920x1080"
    });

    // Assert
    expect(client.screen.update.firstCall.args[0].data).to.include({ resolution: "1920x1080" });
  });

  it("should reject a newly-submitted out-of-bounds resolution on update", async () => {
    // Arrange
    const client = db();
    client.screen.findFirst.resolves(row());

    // Act + Assert
    try {
      await createUpdateScreen(deps(client))({
        id: ID,
        workspaceAccessKeyId: "WO1",
        name: "Renamed",
        city: "Santo Domingo",
        resolution: "640x360"
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect((err as ValidationError).fieldErrors[0]).to.include({
        field: "resolution",
        message: "El lado más corto debe ser de al menos 480 píxeles"
      });
      expect(client.screen.update.called).to.equal(false);
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
      ratePerFiveSecondsCents: 250,
      latitude: 18.4861,
      longitude: -69.9312
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

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  deleteWorkspaceSchema,
  startOfLocalDay,
  timeZoneLabel,
  updateWorkspaceSettingsSchema
} from "../src/index.js";

describe("time zones", () => {
  it("should compute Santo Domingo local midnight (UTC-4, no DST)", () => {
    // Arrange: 02:30 UTC on Sep 15 is still Sep 14 22:30 in Santo Domingo.
    const at = new Date("2026-09-15T02:30:00Z");

    // Act + Assert
    expect(startOfLocalDay(at, "America/Santo_Domingo").toISOString()).to.equal(
      "2026-09-14T04:00:00.000Z"
    );
    expect(startOfLocalDay(at, "America/Santo_Domingo", 1).toISOString()).to.equal(
      "2026-09-15T04:00:00.000Z"
    );
    expect(startOfLocalDay(at, "America/Santo_Domingo", -6).toISOString()).to.equal(
      "2026-09-08T04:00:00.000Z"
    );
  });

  it("should handle New York across the November DST change", () => {
    // Arrange: Nov 2, 2026 12:00 in New York (EST, UTC-5); the day before starts in EDT (UTC-4).
    const at = new Date("2026-11-02T17:00:00Z");

    // Act + Assert
    expect(startOfLocalDay(at, "America/New_York").toISOString()).to.equal(
      "2026-11-02T05:00:00.000Z"
    );
    expect(startOfLocalDay(at, "America/New_York", -1).toISOString()).to.equal(
      "2026-11-01T04:00:00.000Z"
    );
  });

  it("should label zones with their current GMT offset", () => {
    expect(timeZoneLabel("America/Santo_Domingo", new Date("2026-09-14T12:00:00Z"))).to.equal(
      "America/Santo_Domingo (GMT-4)"
    );
    expect(timeZoneLabel("Europe/Madrid", new Date("2026-01-14T12:00:00Z"))).to.equal(
      "Europe/Madrid (GMT+1)"
    );
  });

  it("should validate settings and the delete confirmation", () => {
    expect(
      updateWorkspaceSettingsSchema.safeParse({ name: "Vallas", timezone: "Mars/Olympus" }).success
    ).to.equal(false);
    expect(deleteWorkspaceSchema.safeParse({ confirmation: " eliminar " }).success).to.equal(true);
    expect(deleteWorkspaceSchema.safeParse({ confirmation: "BORRAR" }).success).to.equal(false);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { createScreenSchema, isScreenComplete, updateScreenSchema } from "../src/index.js";

const base = { name: "Valla Churchill", city: "Santo Domingo" };

function issues(input: unknown) {
  const result = createScreenSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => [i.path.join("."), i.message]);
}

describe("screen schema", () => {
  it("should accept description, coordinates and tags, de-duplicating tags", () => {
    // Act
    const parsed = createScreenSchema.parse({
      ...base,
      description: "  Frente al semáforo  ",
      latitude: 18.4861,
      longitude: -69.9312,
      tags: ["tourists", "has-sound", "tourists"]
    });

    // Assert
    expect(parsed.description).to.equal("Frente al semáforo");
    expect(parsed.tags).to.deep.equal(["tourists", "has-sound"]);
    expect(createScreenSchema.parse(base).tags).to.deep.equal([]);
  });

  it("should store the resolution with the larger dimension first, idempotently", () => {
    // Act
    const once = createScreenSchema.parse({ ...base, resolution: "1080x1920" });
    const twice = createScreenSchema.parse(once);

    // Assert
    expect(once.resolution).to.equal("1920x1080");
    expect(twice.resolution).to.equal("1920x1080");
  });

  it("should reject a resolution outside the screen bounds", () => {
    // Act + Assert
    expect(issues({ ...base, resolution: "640x360" })).to.deep.include([
      "resolution",
      "validation.resolution.tooSmall"
    ]);
    expect(issues({ ...base, resolution: "50000x2000" })).to.deep.include([
      "resolution",
      "validation.resolution.tooLarge"
    ]);
    // Free-form width x height stays free-form: a tiled LED panel isn't rejected as an odd shape.
    expect(createScreenSchema.parse({ ...base, resolution: "2048x512" }).resolution).to.equal(
      "2048x512"
    );
    expect(
      updateScreenSchema.safeParse({
        ...base,
        id: "7f9c2f3e-3b8a-4a8e-9d0a-2a3b4c5d6e7f",
        resolution: "640x360"
      }).success
    ).to.equal(false);
  });

  it("should reject invalid resolution, coordinates, tags and description", () => {
    // Act + Assert
    expect(issues({ ...base, resolution: "full hd" })).to.deep.include([
      "resolution",
      "validation.resolution.format"
    ]);
    expect(issues({ ...base, latitude: 18.4861 })).to.deep.include([
      "longitude",
      "validation.coordinates.both"
    ]);
    expect(issues({ ...base, latitude: 40.7128, longitude: -74.006 })).to.deep.include([
      "latitude",
      "validation.coordinates.outsideDr"
    ]);
    expect(issues({ ...base, tags: ["playa"] })).to.deep.include([
      "tags.0",
      "validation.tags.invalid"
    ]);
    expect(issues({ ...base, tags: Array.from({ length: 11 }, () => "beach") })).to.deep.include([
      "tags",
      "validation.tags.max"
    ]);
    expect(issues({ ...base, description: "x".repeat(501) })).to.deep.include([
      "description",
      "validation.description.max"
    ]);
  });

  it("should apply the same coordinate rules on update", () => {
    // Act
    const result = updateScreenSchema.safeParse({
      ...base,
      id: "7f9c2f3e-3b8a-4a8e-9d0a-2a3b4c5d6e7f",
      longitude: -69.9
    });

    // Assert
    expect(result.success).to.equal(false);
  });

  it("should require coordinates for a complete screen", () => {
    // Arrange
    const sellable = {
      availableDays: [1, 2, 3],
      startTime: "08:00",
      endTime: "20:00",
      ratePerFiveSecondsCents: 25
    };

    // Act + Assert
    expect(isScreenComplete(sellable)).to.equal(false);
    expect(isScreenComplete({ ...sellable, latitude: 18.4861, longitude: null })).to.equal(false);
    expect(isScreenComplete({ ...sellable, latitude: 18.4861, longitude: -69.9312 })).to.equal(
      true
    );
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { isInDominicanRepublic, parseCoordinates } from "../src/index.js";

describe("coordinates", () => {
  it("should parse the text Google Maps copies, rounded to six decimals", () => {
    // Act + Assert
    expect(parseCoordinates("18.48612345, -69.93121234")).to.deep.equal({
      latitude: 18.486123,
      longitude: -69.931212
    });
    expect(parseCoordinates(" 18.4861 -69.9312 ")).to.deep.equal({
      latitude: 18.4861,
      longitude: -69.9312
    });
    expect(parseCoordinates("(19.4517; -70.6970)")).to.deep.equal({
      latitude: 19.4517,
      longitude: -70.697
    });
  });

  it("should read hemisphere letters", () => {
    // Act + Assert
    expect(parseCoordinates("18.4861° N, 69.9312° W")).to.deep.equal({
      latitude: 18.4861,
      longitude: -69.9312
    });
    expect(parseCoordinates("18.4861 N 69.9312 O")).to.deep.equal({
      latitude: 18.4861,
      longitude: -69.9312
    });
  });

  it("should read Google Maps links, preferring the pin over the viewport", () => {
    // Act + Assert
    expect(
      parseCoordinates(
        "https://www.google.com/maps/place/Agora+Mall/@18.4830,-69.9390,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d18.4843!4d-69.9383"
      )
    ).to.deep.equal({ latitude: 18.4843, longitude: -69.9383 });
    expect(parseCoordinates("https://www.google.com/maps/@18.4830,-69.9390,17z")).to.deep.equal({
      latitude: 18.483,
      longitude: -69.939
    });
    expect(
      parseCoordinates("https://www.google.com/maps/search/?api=1&query=18.4861%2C-69.9312")
    ).to.deep.equal({ latitude: 18.4861, longitude: -69.9312 });
  });

  it("should return null for empty input", () => {
    // Act + Assert
    expect(parseCoordinates("   ")).to.equal(null);
  });

  it("should explain the most likely mistake", () => {
    // Act + Assert
    expect(parseCoordinates("18.4861, 69.9312")).to.deep.equal({
      error: "validation.coordinates.missingMinus"
    });
    expect(parseCoordinates("-69.9312, 18.4861")).to.deep.equal({
      error: "validation.coordinates.swapped"
    });
    expect(parseCoordinates("40.7128, -74.0060")).to.deep.equal({
      error: "validation.coordinates.outsideDr"
    });
    expect(parseCoordinates("Av. Churchill")).to.deep.equal({
      error: "validation.coordinates.format"
    });
    expect(parseCoordinates("123.4, 500.1")).to.deep.equal({
      error: "validation.coordinates.format"
    });
  });

  it("should include the islands and exclude Puerto Rico", () => {
    // Act + Assert
    expect(isInDominicanRepublic(18.1667, -68.6833), "Saona").to.equal(true);
    expect(isInDominicanRepublic(17.5833, -71.5167), "Beata").to.equal(true);
    expect(isInDominicanRepublic(18.4655, -66.1057), "San Juan").to.equal(false);
  });
});

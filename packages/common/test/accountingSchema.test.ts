/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { centsForPlay, unitsForDurationMs } from "../src/index.js";

describe("unitsForDurationMs", () => {
  it("should convert a positive multiple of 5000 ms into billed units", () => {
    // Act + Assert
    expect(unitsForDurationMs(15000)).to.equal(3);
    expect(unitsForDurationMs(5000)).to.equal(1);
  });

  it("should reject a duration that isn't a multiple of 5000 ms", () => {
    // Act + Assert
    expect(unitsForDurationMs(8000)).to.equal(null);
  });

  it("should reject a zero, negative or missing duration", () => {
    // Act + Assert
    expect(unitsForDurationMs(0)).to.equal(null);
    expect(unitsForDurationMs(-5000)).to.equal(null);
    expect(unitsForDurationMs(null)).to.equal(null);
    expect(unitsForDurationMs(undefined)).to.equal(null);
  });
});

describe("centsForPlay", () => {
  it("should multiply billed units by the snapshotted rate", () => {
    // Act + Assert
    // 3 units (15s) at US$ 2.50/unit (250 cents) = US$ 7.50 (750 cents)
    expect(centsForPlay(3, 250)).to.equal(750);
  });

  it("should charge nothing when units or rate are missing", () => {
    // Act + Assert
    expect(centsForPlay(null, 250)).to.equal(0);
    expect(centsForPlay(3, null)).to.equal(0);
    expect(centsForPlay(undefined, undefined)).to.equal(0);
  });
});

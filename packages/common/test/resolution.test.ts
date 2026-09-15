/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { aspectRatio, normalizeResolution, parseResolution, resolutionTier } from "../src/index.js";

describe("resolution", () => {
  it("should parse WxH, tolerating case, spaces and ×", () => {
    // Act + Assert
    expect(parseResolution("1920x1080")).to.deep.equal({ width: 1920, height: 1080 });
    expect(parseResolution(" 3840 X 2160 ")).to.deep.equal({ width: 3840, height: 2160 });
    expect(parseResolution("1080×1920")).to.deep.equal({ width: 1080, height: 1920 });
  });

  it("should reject values that aren't a resolution", () => {
    // Act + Assert
    for (const value of ["", "1920", "1920x", "full hd", "0x0", "1920x1080p", null, undefined]) {
      expect(parseResolution(value), String(value)).to.equal(null);
    }
  });

  it("should put the larger dimension first and leave invalid text for the schema", () => {
    // Act + Assert
    expect(normalizeResolution("1080x1920")).to.equal("1920x1080");
    expect(normalizeResolution("1920x1080")).to.equal("1920x1080");
    expect(normalizeResolution(" wide ")).to.equal("wide");
  });

  it("should derive the tier from the shorter side", () => {
    // Act + Assert
    expect(resolutionTier("960x480")).to.equal("SD");
    expect(resolutionTier("1280x720")).to.equal("HD");
    expect(resolutionTier("1366x768")).to.equal("HD");
    expect(resolutionTier("1920x1080")).to.equal("FULL_HD");
    expect(resolutionTier("1080x1920")).to.equal("FULL_HD");
    expect(resolutionTier("2560x1440")).to.equal("FULL_HD");
    expect(resolutionTier("3840x2160")).to.equal("UHD_4K");
    expect(resolutionTier("7680x4320")).to.equal("UHD_8K");
    expect(resolutionTier("nope")).to.equal(null);
  });

  it("should snap near-standard panels to common ratios and flip them for portrait", () => {
    // Act + Assert
    expect(aspectRatio("1920x1080")).to.equal("16:9");
    expect(aspectRatio("1366x768")).to.equal("16:9");
    expect(aspectRatio("1920x1080", "PORTRAIT")).to.equal("9:16");
    expect(aspectRatio("1920x1200")).to.equal("16:10");
    expect(aspectRatio("2560x1080")).to.equal("21:9");
    expect(aspectRatio("1024x768")).to.equal("4:3");
    expect(aspectRatio("960x320")).to.equal("3:1");
    expect(aspectRatio("1400x500")).to.equal("2.80:1");
    expect(aspectRatio("")).to.equal(null);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  aspectRatio,
  isResolutionInBounds,
  MAX_SCREEN_LONG_SIDE_PX,
  MIN_SCREEN_SHORT_SIDE_PX,
  MIN_SHORT_SIDE_PX,
  normalizeResolution,
  parseResolution,
  resolutionTier
} from "../src/index.js";

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

  it("should pin the screen floor to the asset upload floor", () => {
    // Act + Assert
    expect(MIN_SCREEN_SHORT_SIDE_PX).to.equal(MIN_SHORT_SIDE_PX);
  });

  it("should bound a resolution by its shorter and longer side, inclusive at both ends", () => {
    // Act + Assert
    expect(
      isResolutionInBounds(`${MIN_SCREEN_SHORT_SIDE_PX}x${MIN_SCREEN_SHORT_SIDE_PX}`)
    ).to.equal(true);
    expect(isResolutionInBounds(`${MIN_SCREEN_SHORT_SIDE_PX - 1}x1000`)).to.equal(false);
    expect(isResolutionInBounds(`1000x${MAX_SCREEN_LONG_SIDE_PX}`)).to.equal(true);
    expect(isResolutionInBounds(`1000x${MAX_SCREEN_LONG_SIDE_PX + 1}`)).to.equal(false);
    // Free-form width x height stays free-form: a tiled LED panel isn't a preset.
    expect(isResolutionInBounds("1152x648")).to.equal(true);
    expect(isResolutionInBounds("2048x512")).to.equal(true);
  });

  it("should treat unparseable, null or undefined resolutions as in bounds", () => {
    // Act + Assert
    expect(isResolutionInBounds("full hd")).to.equal(true);
    expect(isResolutionInBounds(null)).to.equal(true);
    expect(isResolutionInBounds(undefined)).to.equal(true);
  });
});

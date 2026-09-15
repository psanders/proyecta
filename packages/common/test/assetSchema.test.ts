/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  assetKindForType,
  billableVideoDurationMs,
  extensionForType,
  orientationFor,
  uploadAssetSchema
} from "../src/index.js";

describe("asset schema", () => {
  it("should accept MP4, WebM, MOV, JPG, PNG and WebP and reject anything else", () => {
    // Act + Assert
    expect(assetKindForType("video/mp4")).to.equal("VIDEO");
    expect(assetKindForType("video/quicktime")).to.equal("VIDEO");
    expect(assetKindForType("image/png; charset=binary")).to.equal("IMAGE");
    expect(assetKindForType("image/gif")).to.equal(null);
    expect(assetKindForType("application/pdf")).to.equal(null);
    expect(extensionForType("video/quicktime")).to.equal("mov");
  });

  it("should round a video to 5 seconds only within half a second, between 5 and 60 s", () => {
    // Act + Assert
    expect(billableVideoDurationMs(15.03)).to.equal(15000);
    expect(billableVideoDurationMs(14.6)).to.equal(15000);
    expect(billableVideoDurationMs(17)).to.equal(null);
    expect(billableVideoDurationMs(2)).to.equal(null);
    expect(billableVideoDurationMs(65)).to.equal(null);
    expect(billableVideoDurationMs(60.2)).to.equal(60000);
  });

  it("should call a square or wide file landscape and a tall one portrait", () => {
    // Act + Assert
    expect(orientationFor(1920, 1080)).to.equal("LANDSCAPE");
    expect(orientationFor(1080, 1080)).to.equal("LANDSCAPE");
    expect(orientationFor(1080, 1920)).to.equal("PORTRAIT");
  });

  it("should require a 5, 10 or 15 second duration for images", () => {
    // Act
    const result = uploadAssetSchema.safeParse({
      name: "Combo",
      contentType: "image/png",
      sizeBytes: 1000
    });

    // Assert
    expect(result.success).to.equal(false);
    expect(result.error!.issues[0]!.path).to.deep.equal(["durationMs"]);
    expect(result.error!.issues[0]!.message).to.equal("validation.asset.imageDuration");
  });

  it("should reject a file over its kind's size limit and an unsupported type", () => {
    // Act
    const tooLarge = uploadAssetSchema.safeParse({
      name: "Combo",
      contentType: "image/jpeg",
      sizeBytes: 21 * 1024 * 1024,
      durationMs: "10000"
    });
    const gif = uploadAssetSchema.safeParse({ name: "x", contentType: "image/gif", sizeBytes: 1 });

    // Assert
    expect(tooLarge.error!.issues.map((i) => i.message)).to.deep.equal([
      "validation.asset.tooLarge"
    ]);
    expect(gif.error!.issues.map((i) => i.message)).to.include("validation.asset.format");
  });

  it("should accept a video without a duration", () => {
    // Act
    const result = uploadAssetSchema.safeParse({
      name: "Promo",
      contentType: "video/mp4",
      sizeBytes: 5_000_000
    });

    // Assert
    expect(result.success).to.equal(true);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import type { ManifestItem } from "@proyecta/common";
import {
  H264_CONTENT_TYPE,
  VP9_CONTENT_TYPE,
  pickRendition,
  type DecodeSupport
} from "../src/renditions.js";

const video: ManifestItem = {
  id: "arena-blanca",
  type: "video",
  advertiser: "Resort Arena Blanca",
  title: "Escápate este fin de semana",
  durationMs: 15000,
  renditions: { webm: "/m/a.webm", mp4: "/m/a.mp4" }
};

function probeWith(support: Record<string, DecodeSupport>) {
  return sinon
    .stub()
    .callsFake(
      async (type: string) =>
        support[type] ?? { supported: false, smooth: false, powerEfficient: false }
    );
}

const hw = { supported: true, smooth: true, powerEfficient: true };
const sw = { supported: true, smooth: true, powerEfficient: false };

describe("pickRendition", () => {
  afterEach(() => sinon.restore());

  it("should prefer VP9 WebM when the device decodes it in hardware", async () => {
    // Arrange
    const probe = probeWith({ [VP9_CONTENT_TYPE]: hw, [H264_CONTENT_TYPE]: hw });

    // Act
    const result = await pickRendition(video, probe, 1920, 1080);

    // Assert
    expect(result).to.deep.equal({ src: "/m/a.webm", codec: "vp9" });
  });

  it("should fall back to H.264 when VP9 would decode in software", async () => {
    // Arrange
    const probe = probeWith({ [VP9_CONTENT_TYPE]: sw, [H264_CONTENT_TYPE]: hw });

    // Act
    const result = await pickRendition(video, probe, 1920, 1080);

    // Assert
    expect(result).to.deep.equal({ src: "/m/a.mp4", codec: "h264" });
  });

  it("should use software VP9 as a last resort when H.264 is unsupported", async () => {
    // Arrange
    const probe = probeWith({ [VP9_CONTENT_TYPE]: sw });

    // Act
    const result = await pickRendition(video, probe, 1920, 1080);

    // Assert
    expect(result).to.deep.equal({ src: "/m/a.webm", codec: "vp9" });
  });

  it("should return null when nothing is playable", async () => {
    // Arrange
    const probe = probeWith({});

    // Act
    const result = await pickRendition(video, probe, 1920, 1080);

    // Assert
    expect(result).to.equal(null);
  });

  it("should pick WebP for images without probing video codecs", async () => {
    // Arrange
    const probe = probeWith({});
    const image: ManifestItem = { ...video, type: "image", renditions: { webp: "/m/a.webp" } };

    // Act
    const result = await pickRendition(image, probe, 1920, 1080);

    // Assert
    expect(result).to.deep.equal({ src: "/m/a.webp", codec: "webp" });
    expect(probe.called).to.equal(false);
  });
});

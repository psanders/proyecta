/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { manifestSchema } from "../src/index.js";

describe("manifestSchema", () => {
  const manifest = {
    version: "demo-1",
    name: "Rotación General",
    screenName: "Pantalla Demo",
    width: 1920,
    height: 1080,
    items: [
      {
        id: "cafe-aroma",
        type: "image",
        advertiser: "Café Aroma",
        title: "Tu mañana empieza aquí",
        durationMs: 8000,
        renditions: { webp: "/dev/media/cafe-aroma.webp" }
      },
      {
        id: "arena-blanca",
        type: "video",
        advertiser: "Resort Arena Blanca",
        title: "Escápate este fin de semana",
        durationMs: 15000,
        renditions: { webm: "/dev/media/arena-blanca.webm", mp4: "/dev/media/arena-blanca.mp4" }
      }
    ]
  };

  it("should accept a rotation of images and videos", () => {
    // Arrange + Act
    const result = manifestSchema.safeParse(manifest);

    // Assert
    expect(result.success).to.equal(true);
  });

  it("should reject a video without a playable rendition", () => {
    // Arrange
    const broken = structuredClone(manifest);
    broken.items[1]!.renditions = { webp: "/dev/media/poster.webp" } as never;

    // Act
    const result = manifestSchema.safeParse(broken);

    // Assert
    expect(result.success).to.equal(false);
  });
});

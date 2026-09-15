/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { formatResolution, mapsUrl, resolutionFacets } from "../src/lib/format.js";
import { translate, type MessageId } from "../src/lib/i18n.js";

const t = (id: MessageId) => translate("es", id);

describe("resolutionFacets", () => {
  it("should name the tier and aspect ratio of a landscape panel", () => {
    expect(resolutionFacets("1920x1080", "LANDSCAPE", t)).to.equal("Full HD · 16:9");
  });

  it("should flip the aspect ratio when the panel is mounted portrait", () => {
    expect(resolutionFacets("3840x2160", "PORTRAIT", t)).to.equal("4K · 9:16");
  });

  it("should return null when the value isn't a resolution", () => {
    expect(resolutionFacets("full hd", "LANDSCAPE", t)).to.equal(null);
    expect(resolutionFacets(null, null, t)).to.equal(null);
  });
});

describe("mapsUrl", () => {
  it("should point at the pin when there are coordinates", () => {
    expect(mapsUrl({ latitude: 18.4861, longitude: -69.9312 })).to.equal(
      "https://www.google.com/maps/search/?api=1&query=18.4861,-69.9312"
    );
  });

  it("should center on the Dominican Republic without coordinates", () => {
    expect(mapsUrl(null)).to.contain("@18.7357,-70.1627");
  });
});

describe("formatResolution", () => {
  it("should space the dimensions with a multiplication sign", () => {
    expect(formatResolution("1920x1080")).to.equal("1920 × 1080");
  });
});

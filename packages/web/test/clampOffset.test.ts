/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { clampOffset } from "../src/lib/clampOffset.js";

describe("clampOffset", () => {
  const viewport = { width: 350, height: 320 };
  const content = { width: 842, height: 580 };

  it("keeps an offset that is already within bounds", () => {
    expect(clampOffset({ x: -200, y: -100 }, viewport, content)).to.deep.equal({
      x: -200,
      y: -100
    });
  });

  it("stops at the left and top edges (no empty space before the content)", () => {
    expect(clampOffset({ x: 120, y: 90 }, viewport, content)).to.deep.equal({ x: 0, y: 0 });
  });

  it("stops at the right and bottom edges (no empty space after the content)", () => {
    expect(clampOffset({ x: -5000, y: -5000 }, viewport, content)).to.deep.equal({
      x: 350 - 842,
      y: 320 - 580
    });
  });

  it("centers and locks an axis where the content fits inside the viewport", () => {
    expect(clampOffset({ x: -40, y: -40 }, { width: 900, height: 320 }, content)).to.deep.equal({
      x: (900 - 842) / 2,
      y: -40
    });
  });

  it("recomputes against a resized viewport", () => {
    const before = clampOffset({ x: -492, y: 0 }, viewport, content);
    const after = clampOffset(before, { width: 500, height: 320 }, content);
    expect(after.x).to.equal(500 - 842);
  });
});

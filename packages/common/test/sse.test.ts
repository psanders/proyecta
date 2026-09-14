/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { createSseParser } from "../src/index.js";

describe("createSseParser", () => {
  it("should parse events split across chunks and skip keep-alive comments", () => {
    // Arrange
    const parse = createSseParser();

    // Act
    const first = parse('event: state\ndata: {"linked":fal');
    const second = parse('se}\n\n: keep-alive\n\nevent: linked\r\ndata: {"linked":true}\r\n\r\n');

    // Assert
    expect(first).to.deep.equal([]);
    expect(second).to.deep.equal([
      { event: "state", data: '{"linked":false}' },
      { event: "linked", data: '{"linked":true}' }
    ]);
  });
});

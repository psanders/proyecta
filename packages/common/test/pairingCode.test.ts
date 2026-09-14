/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  formatPairingCode,
  generatePairingCode,
  isPairingCode,
  normalizePairingCode,
  pairingCodeSchema
} from "../src/index.js";

describe("pairingCode", () => {
  describe("generatePairingCode", () => {
    it("should produce canonical 8-character codes", () => {
      // Arrange + Act
      const codes = Array.from({ length: 500 }, () => generatePairingCode());

      // Assert
      for (const code of codes) expect(isPairingCode(code)).to.equal(true);
    });

    it("should map random bytes onto the alphabet without look-alike characters", () => {
      // Arrange
      const bytes = () => new Uint8Array([0, 1, 2, 3, 28, 29, 30, 31]);

      // Act
      const code = generatePairingCode(bytes);

      // Assert
      expect(code).to.equal("2345WXYZ");
      expect(code).to.not.match(/[01IO]/);
    });
  });

  describe("normalize and format", () => {
    it("should accept lowercase and dashes and format for display", () => {
      // Arrange + Act
      const canonical = normalizePairingCode(" 8f3k-2qlm ");

      // Assert
      expect(canonical).to.equal("8F3K2QLM");
      expect(formatPairingCode(canonical)).to.equal("8F3K-2QLM");
    });
  });

  describe("pairingCodeSchema", () => {
    it("should reject codes containing ambiguous characters", () => {
      // Arrange + Act
      const result = pairingCodeSchema.safeParse("0F3K-2QLM");

      // Assert
      expect(result.success).to.equal(false);
    });
  });
});

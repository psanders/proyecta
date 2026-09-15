/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import { createGetUserSettings, createUpdateUserLanguage } from "../../../src/api/profile/index.js";

function client(row: { userRef: string; language: string } | null = null) {
  return {
    userSettings: {
      findUnique: sinon.stub().resolves(row),
      upsert: sinon
        .stub()
        .callsFake(async (args: { create: { userRef: string; language: string } }) => args.create)
    }
  };
}

describe("user settings functions", () => {
  afterEach(() => sinon.restore());

  describe("createGetUserSettings", () => {
    it("should default to Spanish when the user never chose a language", async () => {
      // Arrange
      const db = client(null);

      // Act
      const result = await createGetUserSettings(db)({ userRef: "u1" });

      // Assert
      expect(result).to.deep.equal({ language: "es" });
      expect(db.userSettings.findUnique.firstCall.args[0]).to.deep.equal({
        where: { userRef: "u1" }
      });
    });

    it("should return the saved language", async () => {
      // Arrange
      const db = client({ userRef: "u1", language: "en" });

      // Act
      const result = await createGetUserSettings(db)({ userRef: "u1" });

      // Assert
      expect(result).to.deep.equal({ language: "en" });
    });

    it("should reject a missing user before reading", async () => {
      // Arrange
      const db = client();

      // Act + Assert
      try {
        await createGetUserSettings(db)({ userRef: "" });
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(db.userSettings.findUnique.called).to.equal(false);
      }
    });
  });

  describe("createUpdateUserLanguage", () => {
    it("should upsert the language for the user", async () => {
      // Arrange
      const db = client();

      // Act
      const result = await createUpdateUserLanguage(db)({ userRef: "u1", language: "en" });

      // Assert
      expect(result).to.deep.equal({ language: "en" });
      expect(db.userSettings.upsert.firstCall.args[0]).to.deep.equal({
        where: { userRef: "u1" },
        create: { userRef: "u1", language: "en" },
        update: { language: "en" }
      });
    });

    it("should reject an unsupported language without writing", async () => {
      // Arrange
      const db = client();

      // Act + Assert
      try {
        await createUpdateUserLanguage(db)({ userRef: "u1", language: "fr" });
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect((err as ValidationError).fieldErrors[0]).to.include({
          field: "language",
          messageId: "validation.language.invalid"
        });
        expect(db.userSettings.upsert.called).to.equal(false);
      }
    });
  });
});

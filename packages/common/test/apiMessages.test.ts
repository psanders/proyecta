/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  apiMessages,
  deleteWorkspaceSchema,
  LANGUAGES,
  parseLanguage,
  resolveApiMessage,
  signUpSchema,
  updateUserLanguageSchema,
  ValidationError
} from "../src/index.js";

describe("api messages", () => {
  it("should have a non-empty text for every id in every language", () => {
    // Arrange
    const ids = Object.keys(apiMessages.es);

    // Act + Assert
    for (const language of LANGUAGES) {
      expect(Object.keys(apiMessages[language])).to.have.members(ids);
      for (const id of ids) {
        expect(apiMessages[language][id as keyof typeof apiMessages.es].trim()).to.not.equal("");
      }
    }
  });

  it("should resolve an id in each language and pass unknown text through", () => {
    // Act + Assert
    expect(resolveApiMessage("validation.email.invalid", "es")).to.equal(
      "Escribe un correo válido"
    );
    expect(resolveApiMessage("validation.email.invalid", "en")).to.equal("Enter a valid email");
    expect(resolveApiMessage("Invalid input: expected number", "en")).to.equal(
      "Invalid input: expected number"
    );
  });

  it("should fall back to Spanish for a missing or unsupported language", () => {
    // Act + Assert
    expect(parseLanguage("en")).to.equal("en");
    expect(parseLanguage(undefined)).to.equal("es");
    expect(parseLanguage("fr")).to.equal("es");
  });

  it("should reject an unsupported language with a catalog message", () => {
    // Act
    const result = updateUserLanguageSchema.safeParse({ language: "fr" });

    // Assert
    expect(result.success).to.equal(false);
    expect(new ValidationError(result.error!).fieldErrors[0]).to.include({
      field: "language",
      messageId: "validation.language.invalid"
    });
  });

  it("should localize field errors while keeping Spanish as the default", () => {
    // Arrange
    const result = signUpSchema.safeParse({
      name: "Ana",
      businessName: "Vallas",
      email: "not-an-email",
      password: "supersecreta"
    });
    const error = new ValidationError(result.error!);

    // Act
    const english = error.localizedFieldErrors("en");

    // Assert
    expect(error.fieldErrors[0]?.message).to.equal("Escribe un correo válido");
    expect(english[0]).to.include({ field: "email", message: "Enter a valid email" });
  });

  it("should accept the delete confirmation word in either language", () => {
    // Act + Assert
    expect(deleteWorkspaceSchema.safeParse({ confirmation: "delete" }).success).to.equal(true);
    expect(deleteWorkspaceSchema.safeParse({ confirmation: "ELIMINAR" }).success).to.equal(true);
    expect(deleteWorkspaceSchema.safeParse({ confirmation: "BORRAR" }).success).to.equal(false);
  });
});

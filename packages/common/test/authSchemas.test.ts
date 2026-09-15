/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  canManage,
  changePasswordSchema,
  inviteMemberSchema,
  signInSchema,
  signUpSchema,
  ValidationError
} from "../src/index.js";

describe("auth and workspace schemas", () => {
  describe("signUpSchema", () => {
    it("should normalize the email and trim names", () => {
      // Arrange + Act
      const result = signUpSchema.parse({
        name: "  Ana Pérez ",
        businessName: " Vallas del Cibao ",
        email: "  Ana@Example.COM ",
        password: "supersecreta"
      });

      // Assert
      expect(result).to.deep.equal({
        name: "Ana Pérez",
        businessName: "Vallas del Cibao",
        email: "ana@example.com",
        password: "supersecreta"
      });
    });

    it("should reject short passwords with a Spanish message", () => {
      // Arrange + Act
      const result = signUpSchema.safeParse({
        name: "Ana",
        businessName: "Vallas",
        email: "ana@example.com",
        password: "corta"
      });

      // Assert
      expect(result.success).to.equal(false);
      expect(new ValidationError(result.error!).fieldErrors[0]).to.include({
        field: "password",
        message: "La contraseña debe tener al menos 8 caracteres",
        messageId: "validation.password.min"
      });
    });
  });

  it("should reject a malformed email on sign in", () => {
    // Arrange + Act
    const result = signInSchema.safeParse({ email: "ana@", password: "x" });

    // Assert
    expect(result.success).to.equal(false);
  });

  it("should not allow inviting someone as owner", () => {
    // Arrange + Act
    const result = inviteMemberSchema.safeParse({ email: "a@b.do", role: "WORKSPACE_OWNER" });

    // Assert
    expect(result.success).to.equal(false);
  });

  it("should require the current password to change it", () => {
    // Arrange + Act
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "nuevaclave"
    });

    // Assert
    expect(result.success).to.equal(false);
  });

  it("should let only owners and admins manage", () => {
    expect(canManage("WORKSPACE_OWNER")).to.equal(true);
    expect(canManage("WORKSPACE_ADMIN")).to.equal(true);
    expect(canManage("WORKSPACE_MEMBER")).to.equal(false);
    expect(canManage(undefined)).to.equal(false);
  });
});

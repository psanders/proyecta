/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { status } from "@grpc/grpc-js";
import { ValidationError } from "@proyecta/common";
import {
  createRequestPasswordReset,
  createResetPassword,
  createSignIn,
  createSignUp,
  decodeResetToken
} from "../../../src/api/auth/index.js";
import { DomainError } from "../../../src/identity/errors.js";

const grpcError = (code: number) => Object.assign(new Error("grpc"), { code });

describe("auth functions", () => {
  afterEach(() => sinon.restore());

  describe("createSignUp", () => {
    const input = {
      name: "Ana",
      businessName: "Vallas del Cibao",
      email: "Ana@Example.com",
      password: "supersecreta"
    };

    function identity() {
      return {
        createUser: sinon.stub().resolves({ ref: "user-1" }),
        exchangeCredentials: sinon.stub().resolves({ accessToken: "a1", refreshToken: "r1" }),
        createWorkspace: sinon.stub().resolves({ ref: "ws-1" }),
        getWorkspace: sinon.stub().resolves({
          ref: "ws-1",
          accessKeyId: "WO1",
          name: "Vallas del Cibao",
          ownerRef: "user-1"
        }),
        exchangeRefreshToken: sinon.stub().resolves({ accessToken: "a2", refreshToken: "r2" })
      };
    }

    it("should create the user, the business workspace and return a refreshed session", async () => {
      // Arrange
      const id = identity();

      // Act
      const result = await createSignUp(id)(input);

      // Assert
      expect(id.createUser.firstCall.args[0]).to.deep.equal({
        name: "Ana",
        email: "ana@example.com",
        password: "supersecreta"
      });
      expect(id.createWorkspace.firstCall.args).to.deep.equal(["Vallas del Cibao", "a1"]);
      expect(id.exchangeRefreshToken.calledAfter(id.createWorkspace)).to.equal(true);
      expect(result).to.deep.equal({
        accessToken: "a2",
        refreshToken: "r2",
        workspace: { ref: "ws-1", accessKeyId: "WO1", name: "Vallas del Cibao" }
      });
    });

    it("should report an existing email as a conflict and create no workspace", async () => {
      // Arrange
      const id = identity();
      id.createUser.rejects(grpcError(status.ALREADY_EXISTS));

      // Act + Assert
      try {
        await createSignUp(id)(input);
        expect.fail("expected DomainError");
      } catch (err) {
        expect(err).to.be.instanceOf(DomainError);
        expect((err as DomainError).code).to.equal("CONFLICT");
        expect(id.createWorkspace.called).to.equal(false);
      }
    });

    it("should throw ValidationError before calling Identity when the password is short", async () => {
      // Arrange
      const id = identity();

      // Act + Assert
      try {
        await createSignUp(id)({ ...input, password: "corta" });
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(id.createUser.called).to.equal(false);
      }
    });
  });

  describe("createSignIn", () => {
    it("should return the same message for any credential failure", async () => {
      // Arrange
      const id = { exchangeCredentials: sinon.stub().rejects(grpcError(status.PERMISSION_DENIED)) };

      // Act + Assert
      try {
        await createSignIn(id)({ email: "ana@example.com", password: "mala" });
        expect.fail("expected DomainError");
      } catch (err) {
        expect((err as DomainError).code).to.equal("UNAUTHORIZED");
        expect((err as DomainError).message).to.equal("Correo o contraseña incorrectos");
      }
    });
  });

  describe("password reset", () => {
    it("should resolve the same way when Identity fails to send", async () => {
      // Arrange
      const id = { sendResetPasswordCode: sinon.stub().rejects(new Error("smtp down")) };

      // Act
      const result = await createRequestPasswordReset(
        id,
        "http://app/restablecer"
      )({ email: "nadie@example.com" });

      // Assert
      expect(result).to.deep.equal({ sent: true });
      expect(id.sendResetPasswordCode.firstCall.args).to.deep.equal([
        "nadie@example.com",
        "http://app/restablecer"
      ]);
    });

    it("should decode the emailed token and reset the password", async () => {
      // Arrange
      const id = { resetPassword: sinon.stub().resolves() };
      const token = Buffer.from(
        JSON.stringify({ username: "ana@example.com", code: "123456" })
      ).toString("base64");

      // Act
      await createResetPassword(id)({ token, password: "nuevaclave1" });

      // Assert
      expect(id.resetPassword.firstCall.args).to.deep.equal([
        "ana@example.com",
        "nuevaclave1",
        "123456"
      ]);
    });

    it("should reject a garbage token without calling Identity", async () => {
      // Arrange
      const id = { resetPassword: sinon.stub() };

      // Act + Assert
      expect(decodeResetToken("not-base64-json")).to.equal(null);
      try {
        await createResetPassword(id)({ token: "not-base64-json", password: "nuevaclave1" });
        expect.fail("expected DomainError");
      } catch (err) {
        expect((err as DomainError).code).to.equal("BAD_REQUEST");
        expect(id.resetPassword.called).to.equal(false);
      }
    });
  });
});

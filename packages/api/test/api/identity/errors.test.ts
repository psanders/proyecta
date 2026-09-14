/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { status } from "@grpc/grpc-js";
import { TRPCError } from "@trpc/server";
import { signInSchema, ValidationError } from "@proyecta/common";
import { DomainError, toTRPCError } from "../../../src/identity/errors.js";

describe("toTRPCError", () => {
  it("should map Identity gRPC statuses to tRPC codes", () => {
    expect(toTRPCError({ code: status.ALREADY_EXISTS, details: "exists" }).code).to.equal(
      "CONFLICT"
    );
    expect(toTRPCError({ code: status.PERMISSION_DENIED }).code).to.equal("FORBIDDEN");
    expect(toTRPCError({ code: status.UNAVAILABLE }).code).to.equal("SERVICE_UNAVAILABLE");
  });

  it("should turn validation errors into BAD_REQUEST keeping field errors", () => {
    // Arrange
    const parsed = signInSchema.safeParse({ email: "x", password: "" });
    const error = new ValidationError(parsed.error!);

    // Act
    const mapped = toTRPCError(error);

    // Assert
    expect(mapped.code).to.equal("BAD_REQUEST");
    expect((mapped.cause as ValidationError).fieldErrors.length).to.be.greaterThan(0);
  });

  it("should keep domain error codes and messages", () => {
    const mapped = toTRPCError(new DomainError("UNAUTHORIZED", "Correo o contraseña incorrectos"));
    expect(mapped.code).to.equal("UNAUTHORIZED");
    expect(mapped.message).to.equal("Correo o contraseña incorrectos");
  });

  it("should hide unknown errors", () => {
    const mapped = toTRPCError(new Error("db password leaked in message"));
    expect(mapped).to.be.instanceOf(TRPCError);
    expect(mapped.code).to.equal("INTERNAL_SERVER_ERROR");
    expect(mapped.message).to.equal("Error interno");
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { TRPCError } from "@trpc/server";
import { resolveContext, type Services } from "../../../src/trpc/context.js";
import { appRouter } from "../../../src/trpc/router.js";
import { createCallerFactory } from "../../../src/trpc/trpc.js";

const createCaller = createCallerFactory(appRouter);

function services(principal: Awaited<ReturnType<Services["verifyAccessToken"]>>): Services {
  return {
    identity: {
      getUser: sinon.stub().resolves({ ref: "u1", name: "Ana", email: "ana@example.com" }),
      inviteUserToWorkspace: sinon.stub().resolves({ userRef: "u2" })
    } as unknown as Services["identity"],
    verifyAccessToken: sinon.stub().resolves(principal),
    dashboardUrl: "http://app",
    identityBridgeUrl: "http://bridge",
    fetch: sinon.stub() as unknown as typeof fetch
  };
}

async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  try {
    await promise;
    expect.fail(`expected ${code}`);
  } catch (err) {
    expect(err).to.be.instanceOf(TRPCError);
    expect((err as TRPCError).code).to.equal(code);
  }
}

describe("tRPC guards", () => {
  const member = {
    userRef: "u1",
    accessKeyId: "US1",
    access: [{ accessKeyId: "WO1", role: "WORKSPACE_MEMBER" }]
  };
  const admin = {
    userRef: "u1",
    accessKeyId: "US1",
    access: [{ accessKeyId: "WO1", role: "WORKSPACE_ADMIN" }]
  };
  const invite = { email: "nuevo@example.com", role: "WORKSPACE_MEMBER" as const };

  afterEach(() => sinon.restore());

  it("should reject protected procedures without a valid token", async () => {
    // Arrange
    const ctx = await resolveContext(services(null), { authorization: "Bearer bad" });

    // Act + Assert
    await expectCode(createCaller(ctx).profile.get(), "UNAUTHORIZED");
  });

  it("should forbid acting in a workspace the caller doesn't belong to", async () => {
    // Arrange
    const ctx = await resolveContext(services(admin), {
      authorization: "Bearer ok",
      "x-workspace": "WO-other"
    });

    // Act + Assert
    expect(ctx.workspace).to.equal(null);
    await expectCode(createCaller(ctx).workspaces.invite(invite), "FORBIDDEN");
  });

  it("should forbid members from inviting", async () => {
    // Arrange
    const ctx = await resolveContext(services(member), {
      authorization: "Bearer ok",
      "x-workspace": "WO1"
    });

    // Act + Assert
    await expectCode(createCaller(ctx).workspaces.invite(invite), "FORBIDDEN");
  });

  it("should let admins invite", async () => {
    // Arrange
    const svc = services(admin);
    const ctx = await resolveContext(svc, { authorization: "Bearer ok", "x-workspace": "WO1" });

    // Act
    const result = await createCaller(ctx).workspaces.invite(invite);

    // Assert
    expect(result).to.deep.equal({ userRef: "u2" });
  });

  it("should return Spanish field errors for invalid input", async () => {
    // Arrange
    const ctx = await resolveContext(services(null), {});

    // Act + Assert
    try {
      await createCaller(ctx).auth.signIn({ email: "ana@", password: "x" });
      expect.fail("expected BAD_REQUEST");
    } catch (err) {
      expect((err as TRPCError).code).to.equal("BAD_REQUEST");
      expect((err as TRPCError).message).to.contain("Escribe un correo válido");
    }
  });
});

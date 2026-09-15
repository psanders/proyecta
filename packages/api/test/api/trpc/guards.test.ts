/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { TRPCError } from "@trpc/server";
import { resolveContext, type Services } from "../../../src/trpc/context.js";
import { appRouter } from "../../../src/trpc/router.js";
import { createCallerFactory, localizeError } from "../../../src/trpc/trpc.js";

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
    fetch: sinon.stub() as unknown as typeof fetch,
    sync: {} as Services["sync"],
    pairingLimiter: { take: () => true }
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

  describe("language", () => {
    async function caught(promise: Promise<unknown>): Promise<TRPCError> {
      try {
        await promise;
      } catch (err) {
        return err as TRPCError;
      }
      return expect.fail("expected an error");
    }

    it("should read x-language and default to Spanish", async () => {
      // Act
      const english = await resolveContext(services(null), { "x-language": "en" });
      const missing = await resolveContext(services(null), {});
      const unsupported = await resolveContext(services(null), { "x-language": "fr" });

      // Assert
      expect(english.language).to.equal("en");
      expect(missing.language).to.equal("es");
      expect(unsupported.language).to.equal("es");
    });

    it("should localize field errors in English and keep Spanish by default", async () => {
      // Arrange
      const ctx = await resolveContext(services(null), {});
      const err = await caught(
        createCaller(ctx).auth.signUp({
          name: "Ana",
          businessName: "Vallas",
          email: "not-an-email",
          password: "supersecreta"
        })
      );

      // Act
      const english = localizeError(err, err.message, "en");
      const spanish = localizeError(err, err.message, "es");

      // Assert
      expect(english.fieldErrors?.[0]).to.include({
        field: "email",
        message: "Enter a valid email"
      });
      expect(spanish.fieldErrors?.[0]).to.include({
        field: "email",
        message: "Escribe un correo válido"
      });
    });

    it("should localize permission errors", async () => {
      // Arrange
      const ctx = await resolveContext(services(member), {
        authorization: "Bearer ok",
        "x-workspace": "WO1",
        "x-language": "en"
      });
      const err = await caught(createCaller(ctx).workspaces.invite(invite));

      // Act
      const english = localizeError(err, err.message, ctx.language);

      // Assert
      expect(err.code).to.equal("FORBIDDEN");
      expect(err.message).to.equal("Necesitas ser administrador");
      expect(english.message).to.equal("You need to be an administrator");
    });
  });

  describe("profile", () => {
    function withSettings(principal: typeof member, row: { language: string } | null) {
      const svc = services(principal);
      const upsert = sinon.stub().callsFake(async (args: { create: object }) => args.create);
      svc.sync = {
        db: { userSettings: { findUnique: sinon.stub().resolves(row), upsert } }
      } as unknown as Services["sync"];
      return { svc, upsert };
    }

    it("should return the saved language with the profile", async () => {
      // Arrange
      const { svc } = withSettings(member, { language: "en" });
      const ctx = await resolveContext(svc, { authorization: "Bearer ok" });

      // Act
      const profile = await createCaller(ctx).profile.get();

      // Assert
      expect(profile).to.deep.equal({
        ref: "u1",
        name: "Ana",
        email: "ana@example.com",
        language: "en"
      });
    });

    it("should save the caller's language and reject unsupported ones", async () => {
      // Arrange
      const { svc, upsert } = withSettings(member, null);
      const ctx = await resolveContext(svc, { authorization: "Bearer ok" });

      // Act
      const saved = await createCaller(ctx).profile.updateLanguage({ language: "en" });
      await expectCode(
        createCaller(ctx).profile.updateLanguage({ language: "fr" as "en" }),
        "BAD_REQUEST"
      );

      // Assert
      expect(saved).to.deep.equal({ language: "en" });
      expect(upsert.callCount).to.equal(1);
      expect(upsert.firstCall.args[0].where).to.deep.equal({ userRef: "u1" });
    });
  });
});

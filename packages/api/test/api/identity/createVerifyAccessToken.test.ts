/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { exportSPKI, generateKeyPair, SignJWT } from "jose";
import { createVerifyAccessToken } from "../../../src/identity/createVerifyAccessToken.js";

describe("createVerifyAccessToken", () => {
  let privateKey: CryptoKey;
  let publicPem: string;
  const access = [{ accessKeyId: "WO123", role: "WORKSPACE_OWNER" }];

  before(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    privateKey = pair.privateKey;
    publicPem = await exportSPKI(pair.publicKey);
  });

  afterEach(() => sinon.restore());

  function sign(claims: Record<string, unknown>, opts: { aud?: string; exp?: string } = {}) {
    return new SignJWT({ accessKeyId: "US123", access, tokenUse: "access", ...claims })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("user-1")
      .setIssuer("proyecta")
      .setAudience(opts.aud ?? "proyecta")
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "15m")
      .sign(privateKey);
  }

  function verifier(loadPublicKey = sinon.stub().resolves(publicPem)) {
    return {
      verify: createVerifyAccessToken({ loadPublicKey, issuer: "proyecta", audience: "proyecta" }),
      loadPublicKey
    };
  }

  it("should accept a valid access token and return the principal", async () => {
    // Arrange
    const { verify } = verifier();

    // Act
    const principal = await verify(await sign({}));

    // Assert
    expect(principal).to.deep.equal({ userRef: "user-1", accessKeyId: "US123", access });
  });

  it("should reject a refresh token even with a valid signature", async () => {
    // Arrange
    const { verify } = verifier();

    // Act
    const principal = await verify(await sign({ tokenUse: "refresh" }));

    // Assert
    expect(principal).to.equal(null);
  });

  it("should reject a token for another audience", async () => {
    // Arrange
    const { verify } = verifier();

    // Act
    const principal = await verify(await sign({}, { aud: "qcobro" }));

    // Assert
    expect(principal).to.equal(null);
  });

  it("should reject an expired token", async () => {
    // Arrange
    const { verify } = verifier();

    // Act
    const principal = await verify(await sign({}, { exp: "-1m" }));

    // Assert
    expect(principal).to.equal(null);
  });

  it("should load the public key once and retry after a failed load", async () => {
    // Arrange
    const loadPublicKey = sinon.stub();
    loadPublicKey.onFirstCall().rejects(new Error("identity down"));
    loadPublicKey.resolves(publicPem);
    const { verify } = verifier(loadPublicKey);
    const token = await sign({});

    // Act
    const first = await verify(token);
    const second = await verify(token);
    const third = await verify(token);

    // Assert
    expect(first).to.equal(null);
    expect(second?.userRef).to.equal("user-1");
    expect(third?.userRef).to.equal("user-1");
    expect(loadPublicKey.callCount).to.equal(2);
  });
});

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { expect } from "chai";
import express from "express";
import { ANDROID_SHELL_ORIGIN, shellCors } from "../../../src/device/shellCors.js";

describe("shellCors", () => {
  let server: Server;
  let base: string;

  before(async () => {
    const app = express();
    app.use("/device/v1", shellCors());
    app.get("/device/v1/state", (_req, res) => {
      res.json({ ok: true });
    });
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => server.close());

  it("should answer the Android shell's preflight", async () => {
    // Act
    const response = await fetch(`${base}/device/v1/state`, {
      method: "OPTIONS",
      headers: { origin: ANDROID_SHELL_ORIGIN, "access-control-request-headers": "authorization" }
    });

    // Assert
    expect(response.status).to.equal(204);
    expect(response.headers.get("access-control-allow-origin")).to.equal(ANDROID_SHELL_ORIGIN);
    expect(response.headers.get("access-control-allow-headers")).to.contain("authorization");
  });

  it("should allow the Android shell's origin on a normal request", async () => {
    // Act
    const response = await fetch(`${base}/device/v1/state`, {
      headers: { origin: ANDROID_SHELL_ORIGIN }
    });

    // Assert
    expect(response.status).to.equal(200);
    expect(response.headers.get("access-control-allow-origin")).to.equal(ANDROID_SHELL_ORIGIN);
  });

  it("should not grant any other origin", async () => {
    // Act
    const response = await fetch(`${base}/device/v1/state`, {
      headers: { origin: "https://evil.example" }
    });

    // Assert
    expect(response.headers.get("access-control-allow-origin")).to.equal(null);
  });
});

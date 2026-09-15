/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { resolve } from "node:path";
import { expect } from "chai";
import { loadConfig } from "../../src/config.js";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://proyecta:proyecta@localhost:5433/proyecta",
  IDENTITY_ENDPOINT: "localhost:50052",
  IDENTITY_BRIDGE_URL: "http://localhost:9111"
};

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should throw when a required variable is missing", () => {
    process.env = { ...REQUIRED_ENV, DATABASE_URL: "" };
    expect(() => loadConfig()).to.throw("DATABASE_URL is not set");
  });

  it("should default mediaDir to packages/api/.data/media when MEDIA_DIR is unset", () => {
    process.env = { ...REQUIRED_ENV };
    delete process.env.MEDIA_DIR;

    const config = loadConfig();

    expect(config.mediaDir).to.equal(resolve(import.meta.dirname, "../../.data/media"));
  });

  it("should resolve mediaDir from MEDIA_DIR when set", () => {
    process.env = { ...REQUIRED_ENV, MEDIA_DIR: "/data/media" };

    const config = loadConfig();

    expect(config.mediaDir).to.equal(resolve("/data/media"));
  });
});

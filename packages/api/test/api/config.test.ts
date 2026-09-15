/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect } from "chai";
import { loadConfig } from "../../src/config.js";

const MINIMAL = {
  database: { url: "postgresql://proyecta:proyecta@localhost:5433/proyecta" },
  dashboard: { url: "http://localhost:5175" },
  identity: { endpoint: "localhost:50052", bridgeUrl: "http://localhost:9111" }
};

describe("loadConfig", () => {
  let dir: string;
  const originalEnv = { ...process.env };
  const write = (content: unknown, name = "proyecta.json") => {
    const path = join(dir, name);
    writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content));
    return path;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "proyecta-config-"));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(dir, { recursive: true, force: true });
  });

  it("should load a minimal file and apply defaults", () => {
    // Arrange
    const path = write(MINIMAL);

    // Act
    const config = loadConfig(path);

    // Assert
    expect(config).to.deep.include({
      port: 3000,
      databaseUrl: MINIMAL.database.url,
      dashboardUrl: "http://localhost:5175",
      mediaDir: resolve(import.meta.dirname, "../../.data/media")
    });
    expect(config.identity).to.deep.equal({
      ...MINIMAL.identity,
      issuer: "proyecta",
      audience: "proyecta"
    });
  });

  it("should read the path in PROYECTA_CONFIG and resolve media.dir", () => {
    // Arrange
    process.env.PROYECTA_CONFIG = write({
      ...MINIMAL,
      server: { port: 4000 },
      media: { dir: "/data/media" }
    });

    // Act
    const config = loadConfig();

    // Assert
    expect(config.port).to.equal(4000);
    expect(config.mediaDir).to.equal(resolve("/data/media"));
  });

  it("should name the missing file", () => {
    // Act + Assert
    expect(() => loadConfig(join(dir, "missing.json"))).to.throw(
      /Config file not found: .*missing\.json/
    );
  });

  it("should reject a file that isn't JSON", () => {
    // Arrange
    const path = write("DATABASE_URL=postgres://");

    // Act + Assert
    expect(() => loadConfig(path)).to.throw("is not valid JSON");
  });

  it("should name every invalid field", () => {
    // Arrange
    const path = write({ ...MINIMAL, database: {}, server: { port: "3000" } });

    // Act + Assert
    expect(() => loadConfig(path))
      .to.throw(/Invalid config file/)
      .and.to.satisfy(
        (err: Error) => err.message.includes("database.url") && err.message.includes("server.port")
      );
  });
});

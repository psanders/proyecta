// Copyright (C) 2026 by Proyecta. All rights reserved.
// Run with: node --test scripts/downloads/

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildManifest, classify } from "./manifest.mjs";

const file = (name, size = 100) => ({ name, size, sha256: "ab".repeat(32) });
const release = [
  file("Proyecta-v0.9.0.apk", 2_853_280),
  file("proyecta-kiosk_0.9.0_amd64.deb"),
  file("proyecta-kiosk_0.9.0_arm64.deb"),
  file("ProyectaKiosk-0.9.0.exe"),
  file("notes.txt")
];

test("classifies each installer by its name", () => {
  assert.deepEqual(classify("Proyecta-v0.9.0.apk"), { platform: "android", arch: "universal" });
  assert.deepEqual(classify("proyecta-kiosk_0.9.0_arm64.deb"), {
    platform: "linux",
    arch: "arm64"
  });
  assert.deepEqual(classify("ProyectaKiosk-0.9.0.exe"), { platform: "windows", arch: "amd64" });
  assert.equal(classify("notes.txt"), null);
});

test("lists every installer under its version folder", () => {
  const manifest = buildManifest("0.9.0", release, new Date("2026-09-23T15:00:00Z"));
  assert.equal(manifest.version, "0.9.0");
  assert.equal(manifest.publishedAt, "2026-09-23T15:00:00.000Z");
  assert.deepEqual(
    manifest.files.map((f) => f.url),
    [
      "v0.9.0/Proyecta-v0.9.0.apk",
      "v0.9.0/proyecta-kiosk_0.9.0_amd64.deb",
      "v0.9.0/proyecta-kiosk_0.9.0_arm64.deb",
      "v0.9.0/ProyectaKiosk-0.9.0.exe"
    ]
  );
  assert.equal(manifest.files[0].size, 2_853_280);
});

test("refuses a release with a platform missing", () => {
  assert.throws(
    () => buildManifest("0.9.0", release.slice(1)),
    /missing installers: android\/universal/
  );
});

test("refuses an invalid version", () => {
  assert.throws(() => buildManifest("v0.9.0", release), /invalid version/);
});

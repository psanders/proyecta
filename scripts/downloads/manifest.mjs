#!/usr/bin/env node
// Copyright (C) 2026 by Proyecta. All rights reserved.
//
// Builds latest.json for the downloads store (api.proyecta.do/downloads) from one release's
// installers. The proyecta.do/download page reads it; see the player-shells spec.
//
// Usage: node scripts/downloads/manifest.mjs <version> <dir-with-installers> > latest.json

import console from "node:console";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/** Which platform and architecture an installer is for, from the names shells.yml gives them. */
export function classify(name) {
  if (/\.apk$/.test(name)) return { platform: "android", arch: "universal" };
  const deb = /_(amd64|arm64)\.deb$/.exec(name);
  if (deb) return { platform: "linux", arch: deb[1] };
  if (/\.exe$/.test(name)) return { platform: "windows", arch: "amd64" };
  return null;
}

/**
 * latest.json for `version`: every installer with its platform, arch, name, URL relative to the
 * store root, size and SHA-256. Throws when a platform is missing, so a broken release never
 * replaces the previous latest.json.
 */
export function buildManifest(version, files, publishedAt = new Date()) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`invalid version "${version}"`);
  const entries = files
    .map((file) => ({ ...file, kind: classify(file.name) }))
    .filter((file) => file.kind)
    .map(({ name, size, sha256, kind }) => ({
      ...kind,
      name,
      url: `v${version}/${name}`,
      size,
      sha256
    }))
    .sort((a, b) => `${a.platform}/${a.arch}`.localeCompare(`${b.platform}/${b.arch}`));
  const expected = ["android/universal", "linux/amd64", "linux/arm64", "windows/amd64"];
  const found = entries.map((e) => `${e.platform}/${e.arch}`);
  const missing = expected.filter((key) => !found.includes(key));
  if (missing.length) throw new Error(`missing installers: ${missing.join(", ")}`);
  return { version, publishedAt: publishedAt.toISOString(), files: entries };
}

function readDir(dir) {
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .map((name) => {
      const data = readFileSync(join(dir, name));
      return { name, size: data.length, sha256: createHash("sha256").update(data).digest("hex") };
    });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [version, dir] = process.argv.slice(2);
  if (!version || !dir) {
    console.error("usage: manifest.mjs <version> <dir>");
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(buildManifest(version, readDir(dir)), null, 2)}\n`);
}

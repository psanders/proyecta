/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  fetchLatestRelease,
  findInstaller,
  formatReleaseDate,
  formatSize,
  parseLatestRelease
} from "../src/lib/latestRelease.js";

const STORE = "https://api.proyecta.do/downloads";
const latest = {
  version: "0.9.0",
  publishedAt: "2026-09-23T15:00:00.000Z",
  files: [
    {
      platform: "android",
      arch: "universal",
      name: "Proyecta-v0.9.0.apk",
      url: "v0.9.0/Proyecta-v0.9.0.apk",
      size: 2_853_280,
      sha256: "ab"
    },
    {
      platform: "linux",
      arch: "amd64",
      name: "proyecta-kiosk_0.9.0_amd64.deb",
      url: "v0.9.0/proyecta-kiosk_0.9.0_amd64.deb",
      size: 7_340_032,
      sha256: "cd"
    },
    {
      platform: "linux",
      arch: "arm64",
      name: "proyecta-kiosk_0.9.0_arm64.deb",
      url: "v0.9.0/proyecta-kiosk_0.9.0_arm64.deb",
      size: 6_900_000,
      sha256: "ef"
    }
  ]
};

describe("parseLatestRelease", () => {
  it("resolves each file against the store root", () => {
    const release = parseLatestRelease(latest, STORE);

    expect(release?.version).to.equal("0.9.0");
    expect(findInstaller(release, "android")?.url).to.equal(
      "https://api.proyecta.do/downloads/v0.9.0/Proyecta-v0.9.0.apk"
    );
    expect(findInstaller(release, "linux", "arm64")?.name).to.equal(
      "proyecta-kiosk_0.9.0_arm64.deb"
    );
    expect(findInstaller(release, "windows")).to.equal(undefined);
  });

  it("rejects a malformed manifest instead of producing broken links", () => {
    expect(parseLatestRelease({ ...latest, version: "latest" }, STORE)).to.equal(null);
    expect(parseLatestRelease({ ...latest, publishedAt: "yesterday" }, STORE)).to.equal(null);
    expect(parseLatestRelease({ ...latest, files: [{ platform: "ios" }] }, STORE)).to.equal(null);
    expect(parseLatestRelease("<html>", STORE)).to.equal(null);
  });
});

describe("fetchLatestRelease", () => {
  it("reads latest.json from the store", async () => {
    let asked = "";
    const fetchFn = (async (url: string) => {
      asked = url;
      return new Response(JSON.stringify(latest));
    }) as typeof fetch;

    const release = await fetchLatestRelease(STORE, fetchFn);

    expect(asked).to.equal("https://api.proyecta.do/downloads/latest.json");
    expect(release?.files).to.have.length(3);
  });

  it("gives null when the store can't be reached", async () => {
    const fetchFn = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    expect(await fetchLatestRelease(STORE, fetchFn)).to.equal(null);
  });
});

describe("formatting", () => {
  it("shows sizes in MB", () => {
    expect(formatSize(2_853_280)).to.equal("2.7 MB");
    expect(formatSize(12_582_912)).to.equal("12 MB");
  });

  it("shows the release date in Santo Domingo time", () => {
    expect(formatReleaseDate(new Date("2026-09-23T15:00:00Z"))).to.equal("23 sep 2026");
    // 02:00 UTC on the 24th is still the 23rd in Santo Domingo.
    expect(formatReleaseDate(new Date("2026-09-24T02:00:00Z"))).to.equal("23 sep 2026");
  });
});

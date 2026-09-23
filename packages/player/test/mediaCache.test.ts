/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createMediaCache } from "../src/mediaCache.js";

const A = "https://api.proyecta.do/content/a.webm";
const B = "https://api.proyecta.do/content/b.webp";
const OLD = "https://api.proyecta.do/content/old.mp4";

/** An in-memory Cache Storage with a single cache; `add` fails for urls in `offline`. */
function fakeCaches(initial: string[] = [], offline = new Set<string>()) {
  const entries = new Map<string, Response>(initial.map((url) => [url, new Response(url)]));
  const cache = {
    match: sinon.spy(async (url: string) => entries.get(url)?.clone()),
    add: sinon.spy(async (url: string) => {
      if (offline.has(url)) throw new TypeError("Failed to fetch");
      entries.set(url, new Response(url));
    }),
    keys: async () => [...entries.keys()].map((url) => ({ url })),
    delete: sinon.spy(async (request: { url: string }) => entries.delete(request.url))
  };
  return { entries, cache, caches: { open: async () => cache } as unknown as CacheStorage };
}

function setup(initial: string[] = [], offline = new Set<string>()) {
  const fake = fakeCaches(initial, offline);
  let n = 0;
  const revokeObjectURL = sinon.spy();
  const media = createMediaCache({
    caches: fake.caches,
    createObjectURL: () => `blob:${++n}`,
    revokeObjectURL
  });
  return { ...fake, media, revokeObjectURL };
}

describe("createMediaCache", () => {
  it("should play a cached file from a blob URL", async () => {
    // Arrange
    const { media } = setup([A]);

    // Act
    const url = await media.playable(A);

    // Assert
    expect(url).to.equal("blob:1");
  });

  it("should download an uncached file and play it locally, never from the network", async () => {
    // Arrange
    const { media, entries } = setup();

    // Act
    const url = await media.playable(A);

    // Assert
    expect(url).to.equal("blob:1");
    expect(entries.has(A)).to.equal(true);
  });

  it("should fall back to the network URL when a file can't be downloaded", async () => {
    // Arrange
    const { media } = setup([], new Set([A]));

    // Act
    const url = await media.playable(A);

    // Assert
    expect(url).to.equal(A);
  });

  it("should evict files outside the rotation once it is fully cached", async () => {
    // Arrange
    const { media, entries, revokeObjectURL } = setup([A, OLD]);
    await media.playable(OLD);

    // Act
    const complete = await media.retainOnly([A, B]);

    // Assert
    expect(complete).to.equal(true);
    expect([...entries.keys()]).to.have.members([A, B]);
    expect(revokeObjectURL.calledOnceWith("blob:1")).to.equal(true);
  });

  it("should keep the old rotation while the new one can't be fully downloaded", async () => {
    // Arrange
    const { media, entries } = setup([OLD], new Set([B]));

    // Act
    const complete = await media.retainOnly([A, B]);

    // Assert
    expect(complete).to.equal(false);
    expect(entries.has(OLD)).to.equal(true);
  });

  it("should fall back to the network where Cache Storage is unavailable", async () => {
    // Arrange
    const media = createMediaCache({ caches: undefined });

    // Act
    const url = await media.playable(A);

    // Assert
    expect(url).to.equal(A);
  });
});

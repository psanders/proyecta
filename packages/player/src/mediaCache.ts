/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

export const MEDIA_CACHE = "proyecta-media-v1";

export interface MediaCacheDeps {
  caches?: CacheStorage;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export type MediaCache = ReturnType<typeof createMediaCache>;

/**
 * Keeps every rendition the player plays in Cache Storage, so losing the network (mid-session or
 * across a restart) never stops playback. Files are downloaded first and always play from local
 * blob URLs; the network URL is used only when a file can't be cached (no Cache Storage on an
 * insecure origin, or the download failed). Cache Storage (Chromium 40+) rather than OPFS, so it
 * works on the older WebViews the legacy build reaches.
 */
export function createMediaCache(deps: MediaCacheDeps = {}) {
  const storage = deps.caches ?? (typeof caches === "undefined" ? undefined : caches);
  const createObjectURL = deps.createObjectURL ?? ((blob: Blob) => URL.createObjectURL(blob));
  const revokeObjectURL = deps.revokeObjectURL ?? ((url: string) => URL.revokeObjectURL(url));
  const blobUrls = new Map<string, string>();
  const downloads = new Map<string, Promise<boolean>>();
  const open = () =>
    storage ? storage.open(MEDIA_CACHE).catch(() => undefined) : Promise.resolve(undefined);

  /** Downloads `url` into the cache once; resolves whether it is cached now. */
  function download(url: string): Promise<boolean> {
    let pending = downloads.get(url);
    if (!pending) {
      pending = open()
        .then(async (cache) => {
          if (!cache) return false;
          if (await cache.match(url)) return true;
          await cache.add(url);
          return true;
        })
        .catch(() => false)
        .finally(() => downloads.delete(url));
      downloads.set(url, pending);
    }
    return pending;
  }

  return {
    /** A URL the media element can play: the local copy (downloading it first), else `url`. */
    async playable(url: string): Promise<string> {
      const known = blobUrls.get(url);
      if (known) return known;
      if (!(await download(url))) return url;
      const cache = await open();
      const hit = await cache?.match(url).catch(() => undefined);
      if (!hit) return url;
      const blobUrl = createObjectURL(await hit.blob());
      blobUrls.set(url, blobUrl);
      return blobUrl;
    },

    /**
     * Once every file in `keep` is cached, deletes the others and frees their blob URLs, so the
     * cache holds one full rotation. Resolves whether the rotation is fully cached.
     */
    async retainOnly(keep: string[]): Promise<boolean> {
      const results = await Promise.all(keep.map(download));
      if (!results.every(Boolean)) return false;
      const cache = await open();
      if (!cache) return false;
      const wanted = new Set(keep);
      for (const request of await cache.keys()) {
        if (!wanted.has(request.url)) await cache.delete(request);
      }
      for (const [url, blobUrl] of blobUrls) {
        if (wanted.has(url)) continue;
        revokeObjectURL(blobUrl);
        blobUrls.delete(url);
      }
      return true;
    }
  };
}

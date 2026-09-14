/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ManifestItem } from "@proyecta/common";
import type { Rendition } from "./renditions.js";

export interface PreparedItem {
  item: ManifestItem;
  rendition: Rendition;
}

export interface SlotInfo {
  index: number;
  total: number;
  current: PreparedItem;
  next: PreparedItem;
  durationMs: number;
  startedAt: number;
}

export type PlayResult = "completed" | "stalled" | "failed";

export interface PlayRecord {
  itemId: string;
  advertiser: string;
  codec: Rendition["codec"];
  startedAt: number;
  endedAt: number;
  result: PlayResult;
}

export interface EngineHooks {
  onSlotStart?(slot: SlotInfo): void;
  onPlay?(record: PlayRecord): void;
}

export interface EngineOptions {
  /** Caps every slot (testing only). */
  maxSlotMs?: number;
  /** A playing video with no progress for this long is skipped. */
  stallMs?: number;
  /** Give up on an item that can't become ready in this time. */
  readyTimeoutMs?: number;
}

type Layer = HTMLVideoElement | HTMLImageElement;

/**
 * Plays prepared items in an endless loop.
 * - Two reusable <video> and two <img> layers; the next item is readied on the idle layer and
 *   only revealed once it is actually rendering, so there are no black frames between ads.
 * - The slot timer is the clock, not the `ended` event.
 * - A watchdog skips videos that stop progressing.
 */
export class PlaybackEngine {
  private readonly videos: [HTMLVideoElement, HTMLVideoElement];
  private readonly images: [HTMLImageElement, HTMLImageElement];
  private active: Layer | null = null;
  private index = -1;
  private stopped = false;
  private slotTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private readonly stallMs: number;
  private readonly readyTimeoutMs: number;

  constructor(
    root: HTMLElement,
    private readonly items: PreparedItem[],
    private readonly hooks: EngineHooks = {},
    private readonly options: EngineOptions = {}
  ) {
    if (items.length === 0) throw new Error("PlaybackEngine needs at least one item");
    this.stallMs = options.stallMs ?? 3000;
    this.readyTimeoutMs = options.readyTimeoutMs ?? 8000;
    this.videos = [createVideo(), createVideo()];
    this.images = [createImage(), createImage()];
    root.append(...this.videos, ...this.images);
  }

  start(): void {
    this.stopped = false;
    void this.advance();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    for (const video of this.videos) release(video);
  }

  private async advance(): Promise<void> {
    for (let attempt = 0; attempt < this.items.length && !this.stopped; attempt++) {
      this.index = (this.index + 1) % this.items.length;
      const prepared = this.items[this.index]!;
      const startedAt = Date.now();
      const layer = await this.reveal(prepared);
      if (layer) {
        this.runSlot(prepared, layer);
        return;
      }
      this.record(prepared, startedAt, "failed");
    }
    // Nothing could play this round (e.g. media server down): try again shortly.
    if (!this.stopped) setTimeout(() => void this.advance(), 5000);
  }

  /** Readies the item on an idle layer and swaps it in. Resolves null if it can't play. */
  private async reveal({ item, rendition }: PreparedItem): Promise<Layer | null> {
    if (item.type === "image") {
      const img = this.images.find((candidate) => candidate !== this.active)!;
      img.src = rendition.src;
      try {
        await withTimeout(img.decode(), this.readyTimeoutMs);
      } catch {
        return null;
      }
      this.swap(img);
      return img;
    }

    const video = this.videos.find((candidate) => candidate !== this.active)!;
    if (video.dataset.src !== rendition.src) load(video, rendition.src);
    try {
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await waitForEvent(video, "canplay", this.readyTimeoutMs);
      }
      video.currentTime = 0;
      const playing = waitForEvent(video, "playing", this.readyTimeoutMs);
      await video.play();
      await playing;
    } catch {
      release(video);
      return null;
    }
    this.swap(video);
    return video;
  }

  private swap(next: Layer): void {
    const previous = this.active;
    next.classList.add("is-active");
    this.active = next;
    if (previous && previous !== next) {
      previous.classList.remove("is-active");
      if (previous instanceof HTMLVideoElement) release(previous);
    }
  }

  private runSlot(prepared: PreparedItem, layer: Layer): void {
    const durationMs = Math.min(prepared.item.durationMs, this.options.maxSlotMs ?? Infinity);
    const startedAt = Date.now();
    const next = this.items[(this.index + 1) % this.items.length]!;

    this.hooks.onSlotStart?.({
      index: this.index,
      total: this.items.length,
      current: prepared,
      next,
      durationMs,
      startedAt
    });
    this.preload(next);

    this.slotTimer = setTimeout(() => this.finish(prepared, startedAt, "completed"), durationMs);

    if (layer instanceof HTMLVideoElement) {
      let lastTime = -1;
      let lastProgressAt = Date.now();
      this.watchdog = setInterval(() => {
        if (layer.ended) return; // Hold the last frame until the slot ends.
        if (layer.currentTime !== lastTime) {
          lastTime = layer.currentTime;
          lastProgressAt = Date.now();
        } else if (Date.now() - lastProgressAt > this.stallMs) {
          this.finish(prepared, startedAt, "stalled");
        }
      }, 500);
    }
  }

  /** Starts fetching the next item so it is ready when its slot begins. */
  private preload({ item, rendition }: PreparedItem): void {
    if (item.type === "image") {
      const warm = new Image();
      warm.src = rendition.src;
      void warm.decode().catch(() => undefined);
      return;
    }
    const idle = this.videos.find((candidate) => candidate !== this.active)!;
    if (idle.dataset.src !== rendition.src) load(idle, rendition.src);
  }

  private finish(prepared: PreparedItem, startedAt: number, result: PlayResult): void {
    this.clearTimers();
    this.record(prepared, startedAt, result);
    void this.advance();
  }

  private record({ item, rendition }: PreparedItem, startedAt: number, result: PlayResult): void {
    this.hooks.onPlay?.({
      itemId: item.id,
      advertiser: item.advertiser,
      codec: rendition.codec,
      startedAt,
      endedAt: Date.now(),
      result
    });
  }

  private clearTimers(): void {
    clearTimeout(this.slotTimer);
    clearInterval(this.watchdog);
    this.slotTimer = undefined;
    this.watchdog = undefined;
  }
}

function createVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  video.className = "layer";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.disableRemotePlayback = true;
  return video;
}

function createImage(): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "layer";
  img.alt = "";
  img.decoding = "async";
  return img;
}

function load(video: HTMLVideoElement, src: string): void {
  video.dataset.src = src;
  video.src = src;
  video.load();
}

/** Frees the decoder and buffers held by a video element. */
function release(video: HTMLVideoElement): void {
  video.pause();
  delete video.dataset.src;
  video.removeAttribute("src");
  video.load();
}

function waitForEvent(target: HTMLMediaElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`media error while waiting for ${event}`));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);
    target.addEventListener(event, onEvent);
    target.addEventListener("error", onError);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

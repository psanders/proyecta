/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/geist-sans/400.css";
import { manifestSchema, type Manifest } from "@proyecta/common";
import { el } from "./dom.js";
import { PlaybackEngine, type PreparedItem } from "./engine.js";
import { createOverlay } from "./overlay.js";
import { showPairing } from "./pairing.js";
import { createMediaCapabilitiesProbe, pickRendition } from "./renditions.js";
import "./theme.css";
import "./playback.css";
import "./pairing.css";

/**
 * DEMO BOOT. Plays the dev rotation from the API (/dev/manifest) until the device protocol exists.
 * Query flags: ?debug=1 shows the operator overlay (or press "d"); ?slotMs=2000 caps slots (tests).
 */
const MANIFEST_URL = "/dev/manifest";
// Sample code for the pairing layout only. Real codes are minted by the API, never on the device.
const SAMPLE_CODE = "8F3K2QLM";

const params = new URLSearchParams(location.search);
const stage = document.getElementById("stage")!;
window.__proyecta = { plays: [] };

async function fetchManifest(): Promise<Manifest | null> {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const parsed = manifestSchema.safeParse(await response.json());
    if (!parsed.success) console.error("[proyecta] invalid manifest", parsed.error.issues);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function prepare(manifest: Manifest): Promise<PreparedItem[]> {
  const probe = createMediaCapabilitiesProbe();
  const prepared: PreparedItem[] = [];
  for (const item of manifest.items) {
    const rendition = await pickRendition(item, probe, manifest.width, manifest.height);
    if (rendition) prepared.push({ item, rendition });
    else console.warn("[proyecta] no playable rendition", item.id);
  }
  return prepared;
}

async function keepAwake(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  const request = () => navigator.wakeLock.request("screen").catch(() => undefined);
  await request();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void request();
  });
}

async function boot(): Promise<void> {
  void keepAwake();
  stage.classList.toggle("is-debug", params.has("debug"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "d") stage.classList.toggle("is-debug");
    if (event.key === "f") void document.documentElement.requestFullscreen().catch(() => undefined);
  });

  let manifest = await fetchManifest();
  if (!manifest) {
    const hidePairing = showPairing(stage, SAMPLE_CODE);
    while (!manifest) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      manifest = await fetchManifest();
    }
    hidePairing();
  }

  const items = await prepare(manifest);
  if (items.length === 0) {
    console.error("[proyecta] nothing in the rotation is playable on this device; retrying in 60s");
    setTimeout(() => location.reload(), 60_000);
    return;
  }
  window.__proyecta.manifestVersion = manifest.version;
  const adArea = el("div", "ad-area");
  stage.append(adArea);
  const overlay = createOverlay(adArea, stage, manifest.name, manifest.screenName);
  overlay.setOnline(navigator.onLine);
  addEventListener("online", () => overlay.setOnline(true));
  addEventListener("offline", () => overlay.setOnline(false));

  const maxSlotMs = Number(params.get("slotMs")) || undefined;
  const engine = new PlaybackEngine(
    adArea,
    items,
    {
      onSlotStart: (slot) => overlay.slotStart(slot),
      onPlay: (record) => {
        window.__proyecta.plays.push(record);
        console.info("[proyecta] play", record);
      }
    },
    { maxSlotMs }
  );
  engine.start();
}

void boot();

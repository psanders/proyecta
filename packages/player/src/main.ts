/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/geist-sans/400.css";
import type { DeviceShell, DeviceState, Manifest, PlayLogBatch } from "@proyecta/common";
import { el } from "./dom.js";
import { PlaybackEngine, type PreparedItem } from "./engine.js";
import { resolveHardwareId } from "./hardwareId.js";
import { createOverlay } from "./overlay.js";
import { createPairingScreen } from "./pairing.js";
import { createDeviceClient, type DeviceClient } from "./protocol.js";
import { createMediaCapabilitiesProbe, pickRendition } from "./renditions.js";
import { strings } from "./strings.js";
import { startSync, type SyncMode } from "./sync.js";
import "./theme.css";
import "./playback.css";
import "./pairing.css";

/**
 * Player boot on the device protocol: register (permanent code + token) → show the code →
 * stay in sync (stream, polling fallback) → play the rotation while linked → back to the code when
 * unlinked. Query flags: ?debug=1 operator overlay (or press "d"); ?slotMs=2000 caps slots (tests);
 * ?hw=<id> hardware id from a launcher.
 */
const PLAYER_VERSION = "0.5.0"; // x-release-please-version
const HEARTBEAT_MS = 60_000;
const PLAY_LOG_FLUSH_MS = 30_000;
const MAX_QUEUED_PLAYS = 5000;
const SESSION_KEY = "proyecta.session";

interface StoredSession {
  hwId: string;
  code: string;
  deviceToken: string;
}

const params = new URLSearchParams(location.search);
const stage = document.getElementById("stage")!;
const client: DeviceClient = createDeviceClient();
const pairing = createPairingScreen(stage);
const adArea = el("div", "ad-area");
stage.append(adArea);
const overlay = createOverlay(adArea, stage);
const maxSlotMs = Number(params.get("slotMs")) || undefined;
const bootedAt = Date.now();

window.__proyecta = { plays: [] };
let engine: PlaybackEngine | null = null;
let playingVersion: string | null = null;
let currentItemId: string | undefined;
let lastCodec: string | undefined;
const queuedPlays: PlayLogBatch["plays"] = [];

function readSession(hwId: string): StoredSession | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as StoredSession | null;
    return stored?.hwId === hwId ? stored : null;
  } catch {
    return null;
  }
}

function shell(): DeviceShell {
  const fromShell = window.ProyectaShell?.shell?.();
  return fromShell === "ANDROID" || fromShell === "KIOSK_LINUX" || fromShell === "KIOSK_WINDOWS"
    ? fromShell
    : "BROWSER";
}

function chromiumVersion(): string | undefined {
  return navigator.userAgent.match(/Chrom(?:e|ium)\/([\d.]+)/)?.[1];
}

const resolution = () =>
  `${Math.round(screen.width * devicePixelRatio)}x${Math.round(screen.height * devicePixelRatio)}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Registers until it succeeds. Offline with a cached session, the cached one is used meanwhile. */
async function register(hwId: string): Promise<StoredSession> {
  const cached = readSession(hwId);
  pairing.show(cached?.code ?? null);
  pairing.setWaiting(strings.connecting);
  for (;;) {
    try {
      const result = await client.register({
        hwId,
        shell: shell(),
        resolution: resolution(),
        chromiumVersion: chromiumVersion(),
        playerVersion: PLAYER_VERSION
      });
      const session = { hwId, code: result.code, deviceToken: result.deviceToken };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      pairing.setWaiting(strings.offlineRetrying);
      await wait(5000);
    }
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

function stopPlayback() {
  engine?.destroy();
  engine = null;
  playingVersion = null;
  currentItemId = undefined;
}

async function applyState(state: DeviceState, session: StoredSession) {
  if (!state.linked) {
    stopPlayback();
    pairing.show(session.code);
    return;
  }
  const rotation = state.rotation;
  if (!rotation || rotation.items.length === 0) {
    stopPlayback();
    pairing.show(session.code);
    pairing.setWaiting(strings.waitingContent);
    return;
  }
  overlay.setContext(rotation.name, state.screen?.name ?? rotation.screenName);
  if (rotation.version === playingVersion) return;

  const items = await prepare(rotation);
  if (items.length === 0) {
    console.error("[proyecta] nothing in the rotation is playable on this device");
    return;
  }
  stopPlayback();
  playingVersion = rotation.version;
  window.__proyecta.manifestVersion = rotation.version;
  engine = new PlaybackEngine(
    adArea,
    items,
    {
      onSlotStart: (slot) => {
        currentItemId = slot.current.item.id;
        lastCodec = slot.current.rendition.codec;
        overlay.slotStart(slot);
      },
      onPlay: (record) => {
        window.__proyecta.plays.push(record);
        queuedPlays.push({
          itemId: record.itemId,
          codec: record.codec,
          result: record.result,
          startedAt: new Date(record.startedAt).toISOString(),
          endedAt: new Date(record.endedAt).toISOString(),
          durationMs: record.durationMs
        });
        queuedPlays.splice(0, Math.max(0, queuedPlays.length - MAX_QUEUED_PLAYS));
      }
    },
    { maxSlotMs }
  );
  pairing.hide();
  engine.start();
}

async function sendHeartbeat(token: string) {
  const memory = (
    performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
  ).memory;
  const storage = await navigator.storage?.estimate?.().catch(() => undefined);
  const mb = (bytes?: number) => (bytes === undefined ? undefined : Math.round(bytes / 1_048_576));
  await client.heartbeat(token, {
    playerVersion: PLAYER_VERSION,
    uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
    currentItemId,
    codec: lastCodec,
    resolution: resolution(),
    chromiumVersion: chromiumVersion(),
    memoryUsedMb: mb(memory?.usedJSHeapSize),
    memoryTotalMb: mb(memory?.jsHeapSizeLimit),
    storageUsedMb: mb(storage?.usage),
    storageQuotaMb: mb(storage?.quota)
  });
}

async function flushPlays(token: string) {
  if (queuedPlays.length === 0) return;
  const batch = queuedPlays.slice(0, 500);
  await client.playLogs(token, batch);
  queuedPlays.splice(0, batch.length);
}

function modeText(mode: SyncMode): string {
  return mode === "offline"
    ? strings.offlineRetrying
    : mode === "connecting"
      ? strings.connecting
      : strings.waiting;
}

async function keepAwake(): Promise<void> {
  if (!("wakeLock" in navigator)) return;
  const request = () => navigator.wakeLock.request("screen").catch(() => undefined);
  await request();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void request();
  });
}

async function run(hwId: string): Promise<void> {
  const session = await register(hwId);
  pairing.show(session.code);
  pairing.setWaiting(strings.waiting);

  const timers = [
    setInterval(() => void sendHeartbeat(session.deviceToken).catch(() => undefined), HEARTBEAT_MS),
    setInterval(
      () => void flushPlays(session.deviceToken).catch(() => undefined),
      PLAY_LOG_FLUSH_MS
    )
  ];
  void sendHeartbeat(session.deviceToken).catch(() => undefined);

  const sync = startSync({
    client,
    token: session.deviceToken,
    onState: (state) => void applyState(state, session),
    onMode: (mode) => {
      overlay.setOnline(mode === "realtime" || mode === "polling");
      pairing.setWaiting(modeText(mode));
    },
    onUnauthorized: () => {
      // Token rotated elsewhere (e.g. same hardware registered again): register and resync.
      timers.forEach(clearInterval);
      sync.stop();
      void run(hwId);
    }
  });
}

void keepAwake();
stage.classList.toggle("is-debug", params.has("debug"));
document.addEventListener("keydown", (event) => {
  if (event.key === "d") stage.classList.toggle("is-debug");
  if (event.key === "f") void document.documentElement.requestFullscreen().catch(() => undefined);
});
void run(resolveHardwareId(params));

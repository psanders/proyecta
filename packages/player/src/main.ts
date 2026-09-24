/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/geist-sans/400.css";
import type { DeviceState, Manifest, PlayLogBatch } from "@proyecta/common";
import { el } from "./dom.js";
import { PlaybackEngine, type PreparedItem } from "./engine.js";
import { resolveHardwareId } from "./hardwareId.js";
import { createMediaCache } from "./mediaCache.js";
import { createOverlay } from "./overlay.js";
import { createPairingScreen } from "./pairing.js";
import { createDeviceClient, type DeviceClient } from "./protocol.js";
import { createMediaCapabilitiesProbe, pickRendition } from "./renditions.js";
import { healthFigures, readBrowserProbe, resolveShell, type ShellContext } from "./shellInfo.js";
import { strings } from "./strings.js";
import { startSync, type SyncMode } from "./sync.js";
import "./theme.css";
import "./playback.css";
import "./pairing.css";

/**
 * Player boot on the device protocol: register (permanent code + token) → show the code →
 * stay in sync (stream, polling fallback) → play the rotation while linked → back to the code when
 * unlinked. The last rotation and its media are kept on the device, so a restart with no network
 * resumes playing. Query flags: ?debug=1 operator overlay (or press "d"); ?slotMs=2000 caps slots
 * (tests); ?hw=<id> hardware id from a launcher.
 */
const PLAYER_VERSION = "0.9.1"; // x-release-please-version
const HEARTBEAT_MS = 60_000;
const PLAY_LOG_FLUSH_MS = 30_000;
const MAX_QUEUED_PLAYS = 5000;
const SESSION_KEY = "proyecta.session";
const STATE_KEY = "proyecta.state";
/** Absolute API origin for shells that serve the player from their own origin (Android). */
const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

interface StoredSession {
  hwId: string;
  code: string;
  deviceToken: string;
}

const params = new URLSearchParams(location.search);
const stage = document.getElementById("stage")!;
const client: DeviceClient = createDeviceClient(API_BASE);
const media = createMediaCache();
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

interface StoredState {
  hwId: string;
  state: DeviceState;
}

function readState(hwId: string): DeviceState | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null") as StoredState | null;
    return stored?.hwId === hwId ? stored.state : null;
  } catch {
    return null;
  }
}

function saveState(hwId: string, state: DeviceState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ hwId, state } satisfies StoredState));
  } catch {
    // Storage full or unavailable: the player still plays, it just won't resume offline.
  }
}

const mediaUrl = (src: string) => new URL(src, API_BASE || location.href).href;

function chromiumVersion(): string | undefined {
  return navigator.userAgent.match(/Chrom(?:e|ium)\/([\d.]+)/)?.[1];
}

const resolution = () =>
  `${Math.round(screen.width * devicePixelRatio)}x${Math.round(screen.height * devicePixelRatio)}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Registers until it succeeds. Offline with a cached session, the cached one is used meanwhile. */
async function register(hwId: string, shell: ShellContext): Promise<StoredSession> {
  const cached = readSession(hwId);
  pairing.show(cached?.code ?? null);
  pairing.setWaiting(strings.connecting);
  for (;;) {
    try {
      const result = await client.register({
        hwId,
        shell: shell.shell,
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
  const sources: string[] = [];
  for (const item of manifest.items) {
    const rendition = await pickRendition(item, probe, manifest.width, manifest.height);
    if (!rendition) {
      console.warn("[proyecta] no playable rendition", item.id);
      continue;
    }
    const src = mediaUrl(rendition.src);
    prepared.push({ item, rendition: { ...rendition, src: await media.playable(src) } });
    sources.push(src);
  }
  void media.retainOnly(sources);
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

async function sendHeartbeat(token: string, shell: ShellContext) {
  await client.heartbeat(token, {
    ...(await healthFigures(shell, await readBrowserProbe())),
    playerVersion: PLAYER_VERSION,
    uptimeSec: Math.round((Date.now() - bootedAt) / 1000),
    currentItemId,
    codec: lastCodec,
    resolution: resolution(),
    chromiumVersion: chromiumVersion()
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

async function run(hwId: string, shell: ShellContext): Promise<void> {
  const registering = register(hwId, shell);
  const cached = readSession(hwId);
  const lastState = readState(hwId);
  // Resume the last rotation from local media while registration waits for the network.
  if (cached && lastState && !engine) void applyState(lastState, cached);
  const session = await registering;
  if (!engine) {
    pairing.show(session.code);
    pairing.setWaiting(strings.waiting);
  }

  const timers = [
    setInterval(
      () => void sendHeartbeat(session.deviceToken, shell).catch(() => undefined),
      HEARTBEAT_MS
    ),
    setInterval(
      () => void flushPlays(session.deviceToken).catch(() => undefined),
      PLAY_LOG_FLUSH_MS
    )
  ];
  void sendHeartbeat(session.deviceToken, shell).catch(() => undefined);

  const sync = startSync({
    client,
    token: session.deviceToken,
    onState: (state) => {
      saveState(hwId, state);
      void applyState(state, session);
    },
    onMode: (mode) => {
      overlay.setOnline(mode === "realtime" || mode === "polling");
      pairing.setWaiting(modeText(mode));
    },
    onUnauthorized: () => {
      // Token rotated elsewhere (e.g. same hardware registered again): register and resync.
      timers.forEach(clearInterval);
      sync.stop();
      void run(hwId, shell);
    }
  });
}

void keepAwake();
stage.classList.toggle("is-debug", params.has("debug"));
document.addEventListener("keydown", (event) => {
  if (event.key === "d") stage.classList.toggle("is-debug");
  if (event.key === "f") void document.documentElement.requestFullscreen().catch(() => undefined);
});
void resolveShell({ bridge: window.ProyectaShell, fetchFn: (...args) => fetch(...args) }).then(
  (shell) => run(resolveHardwareId(params, shell.info?.hwId), shell)
);

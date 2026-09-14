/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { DeviceState } from "@proyecta/common";
import type { DeviceClient } from "./protocol.js";

export type SyncMode = "connecting" | "realtime" | "polling" | "offline";

export interface SyncOptions {
  client: Pick<DeviceClient, "events" | "state">;
  token: string;
  onState: (state: DeviceState) => void;
  onMode?: (mode: SyncMode) => void;
  /** Called when the server rejects the token (the device must register again). */
  onUnauthorized?: () => void;
  pollMs?: number;
  jitterMs?: number;
  maxBackoffMs?: number;
  random?: () => number;
}

export const STREAM_FAILURES_BEFORE_POLLING = 3;

/**
 * Keeps the player in sync: an event stream in realtime mode; after 3 consecutive stream failures
 * it also polls state every ~60 s while retrying the stream with backoff (max 5 min). With no
 * network at all it reports offline and the player keeps its last rotation.
 */
export function startSync(options: SyncOptions): { stop: () => void; mode: () => SyncMode } {
  const pollMs = options.pollMs ?? 60_000;
  const jitterMs = options.jitterMs ?? 10_000;
  const maxBackoffMs = options.maxBackoffMs ?? 5 * 60_000;
  const random = options.random ?? Math.random;

  let mode: SyncMode = "connecting";
  let failures = 0;
  let stopped = false;
  let controller: AbortController | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  // Read through a function: the stream may change the mode while a poll is awaiting.
  const currentMode = (): SyncMode => mode;
  const setMode = (next: SyncMode) => {
    if (next === mode) return;
    mode = next;
    options.onMode?.(next);
  };

  const unauthorized = (err: unknown) => {
    if ((err as Error)?.name !== "UnauthorizedDeviceError") return false;
    stop();
    options.onUnauthorized?.();
    return true;
  };

  const poll = async () => {
    pollTimer = undefined;
    if (stopped || mode === "realtime") return;
    try {
      options.onState(await options.client.state(options.token));
      if (currentMode() !== "realtime") setMode("polling");
    } catch (err) {
      if (unauthorized(err)) return;
      if (currentMode() !== "realtime") setMode("offline");
    }
    schedulePoll();
  };

  const schedulePoll = () => {
    if (stopped || pollTimer || mode === "realtime") return;
    pollTimer = setTimeout(() => void poll(), pollMs + (random() * 2 - 1) * jitterMs);
  };

  const connect = async () => {
    retryTimer = undefined;
    if (stopped) return;
    controller = new AbortController();
    try {
      await options.client.events(
        options.token,
        (event) => options.onState(event.data),
        () => {
          failures = 0;
          clearTimeout(pollTimer);
          pollTimer = undefined;
          setMode("realtime");
        },
        controller.signal
      );
      failures = 0; // A stream that ended cleanly (e.g. server restart) retries right away.
    } catch (err) {
      if (stopped || unauthorized(err)) return;
      failures += 1;
    }
    if (stopped) return;
    if (failures >= STREAM_FAILURES_BEFORE_POLLING) {
      if (mode === "realtime" || mode === "connecting") setMode("polling");
      if (!pollTimer) void poll();
    } else if (mode === "realtime") {
      setMode("connecting");
    }
    const backoff = Math.min(maxBackoffMs, 1000 * 2 ** Math.min(failures, 12));
    retryTimer = setTimeout(() => void connect(), failures === 0 ? 1000 : backoff);
  };

  const stop = () => {
    stopped = true;
    controller?.abort();
    clearTimeout(retryTimer);
    clearTimeout(pollTimer);
  };

  void connect();
  return { stop, mode: () => mode };
}

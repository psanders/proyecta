/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  shellInfoSchema,
  shellMetricsSchema,
  type DeviceShell,
  type Heartbeat,
  type ShellInfo,
  type ShellMetrics
} from "@proyecta/common";

/** What the Android shell injects as `window.ProyectaShell`; every method returns a string. */
export interface ShellBridge {
  hardwareId?: () => string;
  shell?: () => string;
  version?: () => string;
  /** JSON matching `shellInfoSchema` (minus shell/version, which have their own methods). */
  info?: () => string;
  /** JSON matching `shellMetricsSchema`. */
  metrics?: () => string;
}

/** Where the player runs and what it can report about the hardware under it. */
export interface ShellContext {
  shell: DeviceShell;
  /** Present only inside a native shell. */
  info?: ShellInfo;
  /** Live figures from the shell; undefined in a plain browser or when the shell fails to answer. */
  metrics(): Promise<ShellMetrics | undefined>;
}

export interface ShellSources {
  bridge?: ShellBridge;
  fetchFn?: typeof fetch;
  /** How long to wait for a kiosk helper before deciding this is a plain browser. */
  helperTimeoutMs?: number;
}

const BROWSER: ShellContext = { shell: "BROWSER", metrics: async () => undefined };

function parseJson(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function fromBridge(bridge: ShellBridge): ShellContext | undefined {
  const extra = parseJson(bridge.info?.()) ?? {};
  const info = shellInfoSchema.safeParse({
    ...(typeof extra === "object" ? extra : {}),
    shell: bridge.shell?.(),
    version: bridge.version?.(),
    hwId: bridge.hardwareId?.()
  });
  if (!info.success) return undefined;
  return {
    shell: info.data.shell,
    info: info.data,
    metrics: async () => {
      const parsed = shellMetricsSchema.safeParse(parseJson(bridge.metrics?.()));
      return parsed.success ? parsed.data : undefined;
    }
  };
}

async function fetchJson(fetchFn: typeof fetch, path: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(path, { signal: controller.signal });
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function fromHelper(
  fetchFn: typeof fetch,
  timeoutMs: number
): Promise<ShellContext | undefined> {
  const info = shellInfoSchema.safeParse(await fetchJson(fetchFn, "/shell/info", timeoutMs));
  if (!info.success) return undefined;
  return {
    shell: info.data.shell,
    info: info.data,
    metrics: async () => {
      const parsed = shellMetricsSchema.safeParse(
        await fetchJson(fetchFn, "/shell/metrics", timeoutMs)
      );
      return parsed.success ? parsed.data : undefined;
    }
  };
}

/**
 * Finds the shell hosting the player: the Android bridge first, then a kiosk helper on the same
 * origin (`/shell/info`), otherwise a plain browser. A source that answers with invalid data is
 * treated as absent.
 */
export async function resolveShell(sources: ShellSources = {}): Promise<ShellContext> {
  if (sources.bridge) {
    const bridged = fromBridge(sources.bridge);
    if (bridged) return bridged;
  }
  if (sources.fetchFn) {
    const helped = await fromHelper(sources.fetchFn, sources.helperTimeoutMs ?? 500);
    if (helped) return helped;
  }
  return BROWSER;
}

/** Browser APIs the health figures read; injectable for tests. */
export interface BrowserProbe {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  jsHeapUsedBytes?: number;
  storage?: { usage?: number; quota?: number };
}

const mb = (bytes?: number) => (bytes === undefined ? undefined : Math.round(bytes / 1_048_576));

/**
 * The health part of a heartbeat, each figure with its exact meaning (see the `device-sync`
 * spec). RAM, disk and CPU load come only from a shell; a plain browser reports cores, its
 * approximate RAM bucket, the player cache and the page's JS heap, which is never RAM.
 */
export async function healthFigures(
  context: ShellContext,
  probe: BrowserProbe
): Promise<Partial<Heartbeat>> {
  const metrics = await context.metrics().catch(() => undefined);
  const figures: Partial<Heartbeat> = {
    cpuCores: context.info?.cpuCores ?? probe.hardwareConcurrency,
    storageUsedMb: mb(probe.storage?.usage),
    storageQuotaMb: mb(probe.storage?.quota),
    jsHeapUsedMb: mb(probe.jsHeapUsedBytes)
  };
  if (!context.info) return { ...figures, deviceMemoryApproxGb: probe.deviceMemory };
  return {
    ...figures,
    ...metrics,
    shellVersion: context.info.version,
    deviceModel: context.info.deviceModel,
    osVersion: context.info.osVersion
  };
}

/** Reads the browser figures from the real page. */
export async function readBrowserProbe(): Promise<BrowserProbe> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  const storage = await navigator.storage?.estimate?.().catch(() => undefined);
  return {
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    deviceMemory: nav.deviceMemory,
    jsHeapUsedBytes: memory?.usedJSHeapSize,
    storage
  };
}

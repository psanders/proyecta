/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  createSseParser,
  deviceStateSchema,
  registerDeviceResponseSchema,
  type DeviceEvent,
  type DeviceShell,
  type DeviceState,
  type Heartbeat,
  type PlayLogBatch,
  type RegisterDeviceResponse
} from "@proyecta/common";

export class UnauthorizedDeviceError extends Error {
  constructor() {
    super("device token rejected");
    this.name = "UnauthorizedDeviceError";
  }
}

export interface RegisterRequest {
  hwId: string;
  shell: DeviceShell;
  resolution?: string;
  chromiumVersion?: string;
  playerVersion?: string;
}

export type DeviceClient = ReturnType<typeof createDeviceClient>;

/** Thin client for /device/v1. Throws UnauthorizedDeviceError on 401 so callers can re-register. */
export function createDeviceClient(
  baseUrl = "",
  fetchFn: typeof fetch = (...args) => fetch(...args)
) {
  const url = (path: string) => `${baseUrl}/device/v1/${path}`;

  async function request(
    path: string,
    token: string | null,
    init: RequestInit = {}
  ): Promise<Response> {
    const response = await fetchFn(url(path), {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      }
    });
    if (response.status === 401) throw new UnauthorizedDeviceError();
    if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
    return response;
  }

  return {
    async register(body: RegisterRequest): Promise<RegisterDeviceResponse> {
      const response = await request("register", null, {
        method: "POST",
        body: JSON.stringify(body)
      });
      return registerDeviceResponseSchema.parse(await response.json());
    },

    async state(token: string): Promise<DeviceState> {
      return deviceStateSchema.parse(await (await request("state", token)).json());
    },

    async heartbeat(token: string, body: Heartbeat): Promise<void> {
      await request("heartbeat", token, { method: "POST", body: JSON.stringify(body) });
    },

    async playLogs(token: string, plays: PlayLogBatch["plays"]): Promise<void> {
      await request("play-logs", token, { method: "POST", body: JSON.stringify({ plays }) });
    },

    /**
     * Reads the event stream until it ends or `signal` aborts. `onOpen` fires once the server
     * accepted the stream. Resolves when the stream ends; rejects on network or auth errors.
     */
    async events(
      token: string,
      onEvent: (event: DeviceEvent) => void,
      onOpen: () => void,
      signal: AbortSignal
    ): Promise<void> {
      const response = await request("events", token, { signal });
      if (!response.body) throw new Error("event stream has no body");
      onOpen();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parse = createSseParser();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        for (const message of parse(decoder.decode(value, { stream: true }))) {
          const data = deviceStateSchema.safeParse(JSON.parse(message.data));
          if (!data.success) continue;
          if (["state", "linked", "unlinked", "rotation.updated"].includes(message.event)) {
            onEvent({ type: message.event, data: data.data } as DeviceEvent);
          }
        }
      }
    }
  };
}

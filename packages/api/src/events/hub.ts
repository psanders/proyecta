/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { EventEmitter } from "node:events";
import type { DeviceEvent, ScreenStatusView } from "@proyecta/common";

export interface ScreenStatusEvent {
  screenId: string;
  status: ScreenStatusView;
}

/**
 * In-process pub/sub for live updates (single API instance). Devices get protocol events;
 * dashboard viewers of a workspace get screen status changes. Also tracks open device streams.
 */
export class EventHub {
  private readonly emitter = new EventEmitter();
  private readonly openStreams = new Map<string, number>();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publishToDevice(deviceId: string, event: DeviceEvent): void {
    this.emitter.emit(`device:${deviceId}`, event);
  }

  subscribeDevice(deviceId: string, listener: (event: DeviceEvent) => void): () => void {
    this.emitter.on(`device:${deviceId}`, listener);
    return () => this.emitter.off(`device:${deviceId}`, listener);
  }

  publishToWorkspace(workspaceAccessKeyId: string, event: ScreenStatusEvent): void {
    this.emitter.emit(`workspace:${workspaceAccessKeyId}`, event);
  }

  subscribeWorkspace(
    workspaceAccessKeyId: string,
    listener: (event: ScreenStatusEvent) => void
  ): () => void {
    this.emitter.on(`workspace:${workspaceAccessKeyId}`, listener);
    return () => this.emitter.off(`workspace:${workspaceAccessKeyId}`, listener);
  }

  /** Marks a device stream as open; returns a function that closes it. */
  openStream(deviceId: string): () => void {
    this.openStreams.set(deviceId, (this.openStreams.get(deviceId) ?? 0) + 1);
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      const next = (this.openStreams.get(deviceId) ?? 1) - 1;
      if (next <= 0) this.openStreams.delete(deviceId);
      else this.openStreams.set(deviceId, next);
    };
  }

  isStreamOpen(deviceId: string): boolean {
    return this.openStreams.has(deviceId);
  }
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { el, icon } from "./dom.js";
import type { SlotInfo } from "./engine.js";
import { icons } from "./icons.js";
import { strings } from "./strings.js";

export interface Overlay {
  slotStart(slot: SlotInfo): void;
  setOnline(online: boolean): void;
}

/**
 * Operator overlay from Pencil frame player-now-playing: now-playing pill, countdown, next-up,
 * time code, progress, and the status bar. Only visible when the stage has `is-debug`.
 */
export function createOverlay(
  adArea: HTMLElement,
  stage: HTMLElement,
  rotationName: string,
  screenName: string
): Overlay {
  const overlay = el("div", "overlay");
  const nowPlaying = el("div", "pill now-playing");
  nowPlaying.append(el("span", "dot"), el("span", "", strings.nowPlaying));
  const countdown = el("div", "pill countdown");
  const seconds = el("span", "", "00s");
  countdown.append(icon(icons.timer), seconds);

  const nextLabel = el("span");
  const nextUp = el("div", "next-up");
  nextUp.append(icon(icons.skipNext), nextLabel);
  const timeCode = el("span", "time-code", "0:00 / 0:00");
  const metaRow = el("div", "meta-row");
  metaRow.append(nextUp, timeCode);
  const fill = el("div", "fill");
  const track = el("div", "track");
  track.append(fill);
  const bottom = el("div", "bottom");
  bottom.append(metaRow, track);
  overlay.append(el("div", "scrim-top"), el("div", "scrim-bottom"), nowPlaying, countdown, bottom);
  adArea.append(overlay);

  const brand = el("div", "brand");
  brand.append(icon(icons.tv), el("span", "", strings.brand));
  const playlistLabel = el("span");
  const playlist = el("div", "playlist");
  playlist.append(icon(icons.playlistPlay), playlistLabel);
  const liveLabel = el("span");
  const live = el("div", "live");
  live.append(el("span", "dot"), liveLabel);
  const clock = el("span", "clock");
  const right = el("div", "right");
  right.append(live, clock);
  const statusBar = el("div", "status-bar");
  statusBar.append(brand, playlist, right);
  stage.append(statusBar);

  let slot: SlotInfo | null = null;

  const render = () => {
    clock.textContent = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    if (!slot) return;
    const elapsed = Math.min(Date.now() - slot.startedAt, slot.durationMs);
    const remaining = Math.max(0, Math.ceil((slot.durationMs - elapsed) / 1000));
    seconds.textContent = `${String(remaining).padStart(2, "0")}s`;
    timeCode.textContent = `${formatClock(elapsed)} / ${formatClock(slot.durationMs)}`;
    fill.style.width = `${(elapsed / slot.durationMs) * 100}%`;
  };
  setInterval(render, 250);
  render();

  return {
    slotStart(next) {
      slot = next;
      nextLabel.textContent = strings.next(
        next.next.item.advertiser,
        Math.round(next.next.item.durationMs / 1000)
      );
      playlistLabel.textContent = strings.playlist(rotationName, next.index + 1, next.total);
      render();
    },
    setOnline(online) {
      live.classList.toggle("is-offline", !online);
      liveLabel.textContent = `${screenName} · ${online ? strings.connected : strings.offline}`;
    }
  };
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

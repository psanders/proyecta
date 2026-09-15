/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { WEEKDAY_LABELS } from "@proyecta/common";
import { strings } from "../strings.js";

/** "Lun–Vie · 8:00–20:00", "Todos los días · 9:00–22:00", or null when not set. */
export function availabilitySummary(
  days: number[],
  start: string | null,
  end: string | null
): string | null {
  if (days.length === 0 || !start || !end) return null;
  const hours = `${trimHour(start)}–${trimHour(end)}`;
  if (days.length === 7) return `Todos los días · ${hours}`;
  const consecutive = days.every((day, i) => i === 0 || day === days[i - 1]! + 1);
  const label =
    consecutive && days.length > 2
      ? `${WEEKDAY_LABELS[days[0]!]}–${WEEKDAY_LABELS[days[days.length - 1]!]}`
      : days.map((d) => WEEKDAY_LABELS[d]).join(", ");
  return `${label} · ${hours}`;
}

/** "20:00" → "8:00 PM" (screen detail schedule, as in Pencil). */
export function formatTime12(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function trimHour(time: string): string {
  return time.replace(/^0(\d)/, "$1");
}

/** "US$ 2.50" — `cents` are integer US$ cents (pay-per-display rates and earnings). */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `US$ ${new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars)}`;
}

/** "1 reproducción" / "12 reproducciones" */
export function formatPlays(n: number): string {
  return n === 1 ? "1 reproducción" : `${n} reproducciones`;
}

/** "hace 5 min" */
export function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return strings.relative.now;
  if (minutes < 60) return strings.relative.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return strings.relative.hours(hours);
  return strings.relative.days(Math.floor(hours / 24));
}

/** "2 h 15 min" */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

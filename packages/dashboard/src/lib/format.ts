/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { locales, type Language, type MessageId, type Translate } from "./i18n.js";

const weekday = (t: Translate, day: number) => t(`weekday.${day}` as MessageId);

/** "Lun–Vie · 8:00–20:00", "Todos los días · 9:00–22:00", or null when not set. */
export function availabilitySummary(
  days: number[],
  start: string | null,
  end: string | null,
  t: Translate
): string | null {
  if (days.length === 0 || !start || !end) return null;
  const hours = `${trimHour(start)}–${trimHour(end)}`;
  if (days.length === 7) return `${t("format.everyDay")} · ${hours}`;
  const consecutive = days.every((day, i) => i === 0 || day === days[i - 1]! + 1);
  const label =
    consecutive && days.length > 2
      ? `${weekday(t, days[0]!)}–${weekday(t, days[days.length - 1]!)}`
      : days.map((d) => weekday(t, d)).join(", ");
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
export function formatCents(cents: number, language: Language): string {
  const dollars = cents / 100;
  return `US$ ${new Intl.NumberFormat(locales[language], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars)}`;
}

/** "1 reproducción" / "12 reproducciones" */
export function formatPlays(n: number, t: Translate): string {
  return n === 1 ? t("format.plays.one") : t("format.plays.other", { n });
}

/** "hace 5 min" / "5 min ago" */
export function relativeTime(iso: string, t: Translate, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t("relative.now");
  if (minutes < 60) return t("relative.minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relative.hours", { n: hours });
  return t("relative.days", { n: Math.floor(hours / 24) });
}

/** "2 h 15 min" */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

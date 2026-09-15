/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { aspectRatio, resolutionTier, type Orientation } from "@proyecta/common";
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

/** "1 jun 2026" for a "YYYY-MM-DD" calendar date (no time zone shift). */
export function formatDate(date: string, language: Language): string {
  return new Intl.DateTimeFormat(locales[language], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "1 jun 2026 – 30 jun 2026", or a single date when both are the same day. */
export function formatDateRange(start: string, end: string, language: Language): string {
  return start === end
    ? formatDate(start, language)
    : `${formatDate(start, language)} – ${formatDate(end, language)}`;
}

/** "15 s" */
export function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)} s`;
}

/** "1 de 2 pantallas" / "0 de 1 pantalla": how many of an ad's screens are approved. */
export function formatReach(screens: { approved: number; total: number }, t: Translate): string {
  return screens.total === 1
    ? t("ads.reach.one", { approved: screens.approved })
    : t("ads.reach", { approved: screens.approved, total: screens.total });
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

/** Google Maps at a pin, or centered on the Dominican Republic when there are no coordinates. */
export function mapsUrl(coordinates?: { latitude: number; longitude: number } | null): string {
  return coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : "https://www.google.com/maps/@18.7357,-70.1627,8z";
}

/** "1920 × 1080" for a "1920x1080" resolution. */
export function formatResolution(resolution: string): string {
  return resolution.replace(/x/i, " × ");
}

/** "Full HD · 16:9" (or "Full HD · 9:16" mounted portrait), or null when it isn't a resolution. */
export function resolutionFacets(
  resolution: string | null | undefined,
  orientation: string | null | undefined,
  t: Translate
): string | null {
  const tier = resolutionTier(resolution);
  if (!tier) return null;
  const aspect = aspectRatio(resolution, orientation as Orientation | null | undefined);
  return [t(`resolutionTier.${tier}`), aspect].filter(Boolean).join(" · ");
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/** Curated IANA time zones for the markets Proyecta serves (Dominican Republic first). */
export const TIMEZONES = [
  "America/Santo_Domingo",
  "America/Puerto_Rico",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Panama",
  "America/Costa_Rica",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "Europe/Madrid"
] as const;

export type TimeZone = (typeof TIMEZONES)[number];
export const DEFAULT_TIMEZONE: TimeZone = "America/Santo_Domingo";

/** Milliseconds `timeZone` is ahead of UTC at `date` (negative west of Greenwich). */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return wall - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The UTC instant of local midnight in `timeZone`, `daysOffset` calendar days from the local day of
 * `date`. DST-safe: the offset is re-evaluated at the target wall time.
 */
export function startOfLocalDay(date: Date, timeZone: string, daysOffset = 0): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const wallMidnight = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + daysOffset
  );
  let instant = wallMidnight - timeZoneOffsetMs(new Date(wallMidnight), timeZone);
  instant = wallMidnight - timeZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** "America/Santo_Domingo (GMT-4)" for pickers. */
export function timeZoneLabel(timeZone: string, at: Date = new Date()): string {
  const hours = timeZoneOffsetMs(at, timeZone) / 3_600_000;
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  const formatted = Number.isInteger(abs)
    ? `${abs}`
    : `${Math.floor(abs)}:${String(Math.round((abs % 1) * 60)).padStart(2, "0")}`;
  return `${timeZone} (GMT${sign}${formatted})`;
}

/** The calendar date ("YYYY-MM-DD") that `date` falls on in `timeZone`. */
export function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * The UTC instant a "YYYY-MM-DD" calendar date starts in `timeZone`, `daysOffset` days later (e.g.
 * `1` for the exclusive end of that date).
 */
export function startOfLocalDate(date: string, timeZone: string, daysOffset = 0): Date {
  // Noon UTC falls on the same calendar date in every supported time zone (all within ±12 h).
  return startOfLocalDay(new Date(`${date}T12:00:00Z`), timeZone, daysOffset);
}

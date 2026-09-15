/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/**
 * A box around the Dominican Republic, islands included (Saona, Beata, Alto Velo). It overlaps a
 * sliver of Haiti near the border, which is fine for manually entered coordinates.
 */
export const DR_BOUNDS = {
  minLatitude: 17.3,
  maxLatitude: 20.0,
  minLongitude: -72.1,
  maxLongitude: -68.2
} as const;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type CoordinatesError =
  | "validation.coordinates.format"
  | "validation.coordinates.missingMinus"
  | "validation.coordinates.swapped"
  | "validation.coordinates.outsideDr";

export function isInDominicanRepublic(latitude: number, longitude: number): boolean {
  return (
    latitude >= DR_BOUNDS.minLatitude &&
    latitude <= DR_BOUNDS.maxLatitude &&
    longitude >= DR_BOUNDS.minLongitude &&
    longitude <= DR_BOUNDS.maxLongitude
  );
}

/** Six decimals is about 11 cm: more than enough for a screen, and keeps stored values tidy. */
export const roundCoordinate = (value: number) => Math.round(value * 1e6) / 1e6;

const NUMBER = String.raw`[-+]?\d{1,3}(?:\.\d+)?`;
// Google Maps place links carry the pin as !3d<lat>!4d<lng>; `@lat,lng` is the viewport center.
const MAPS_PIN = new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`);
const MAPS_CENTER = new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`);
const MAPS_QUERY = new RegExp(
  String.raw`[?&](?:q|query|ll|destination)=(${NUMBER})(?:,|%2C)\s*(${NUMBER})(?:[&#]|$)`,
  "i"
);
// "18.4861, -69.9312", "18.4861 -69.9312", "(18.4861; -69.9312)", "18.4861° N, 69.9312° W".
const PLAIN = new RegExp(
  String.raw`^\(?\s*(${NUMBER})\s*°?\s*([NS])?\s*[,;\s]\s*(${NUMBER})\s*°?\s*([EWO])?\s*\)?$`,
  "i"
);

function extract(text: string): [number, number] | null {
  for (const pattern of [MAPS_PIN, MAPS_QUERY, MAPS_CENTER]) {
    const match = pattern.exec(text);
    if (match) return [Number(match[1]), Number(match[2])];
  }
  const match = PLAIN.exec(text);
  if (!match) return null;
  const [, lat, ns, lng, ew] = match;
  // A hemisphere letter sets the sign: S and W (O for "oeste") are negative.
  const latitude = ns ? Math.abs(Number(lat)) * (/s/i.test(ns) ? -1 : 1) : Number(lat);
  const longitude = ew ? Math.abs(Number(lng)) * (/[wo]/i.test(ew) ? -1 : 1) : Number(lng);
  return [latitude, longitude];
}

/**
 * Coordinates from what an owner pastes: `lat, lng` text (as Google Maps copies it) or a Google
 * Maps link. Returns `null` for empty input, the coordinates rounded to six decimals, or the id of
 * a message explaining the most likely mistake.
 */
export function parseCoordinates(input: string): Coordinates | { error: CoordinatesError } | null {
  const text = input.trim();
  if (text === "") return null;
  const pair = extract(text);
  if (!pair || pair.some((n) => !Number.isFinite(n))) {
    return { error: "validation.coordinates.format" };
  }
  const [first, second] = pair;
  if (isInDominicanRepublic(first, second)) {
    return { latitude: roundCoordinate(first), longitude: roundCoordinate(second) };
  }
  if (isInDominicanRepublic(first, -second))
    return { error: "validation.coordinates.missingMinus" };
  if (isInDominicanRepublic(second, first) || isInDominicanRepublic(second, -first)) {
    return { error: "validation.coordinates.swapped" };
  }
  if (Math.abs(first) > 90 || Math.abs(second) > 180) {
    return { error: "validation.coordinates.format" };
  }
  return { error: "validation.coordinates.outsideDr" };
}

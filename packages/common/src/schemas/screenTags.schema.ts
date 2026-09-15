/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/**
 * The curated screen tag catalog, grouped. Ids are stored on screens and never change meaning;
 * labels live in the dashboard's message catalogs (`tagGroup.<group>`, `tag.<id>`). Tags describe
 * audience and surroundings only: place type, indoor/outdoor, city, orientation and resolution
 * are fields of their own.
 */
export const SCREEN_TAG_GROUPS = {
  audience: [
    "families",
    "young-adults",
    "students",
    "professionals",
    "tourists",
    "athletes",
    "drivers",
    "shoppers"
  ],
  area: [
    "tourist-area",
    "shopping-area",
    "business-district",
    "residential-area",
    "nightlife",
    "beach",
    "near-university"
  ],
  traffic: ["high-foot-traffic", "high-vehicle-traffic", "long-dwell", "short-dwell"],
  experience: ["has-sound", "street-visible"]
} as const;

export type ScreenTagGroup = keyof typeof SCREEN_TAG_GROUPS;
export type ScreenTag = (typeof SCREEN_TAG_GROUPS)[ScreenTagGroup][number];

export const SCREEN_TAG_GROUP_IDS = Object.keys(SCREEN_TAG_GROUPS) as ScreenTagGroup[];
export const SCREEN_TAGS = Object.values(SCREEN_TAG_GROUPS).flat() as [ScreenTag, ...ScreenTag[]];
export const MAX_SCREEN_TAGS = 10;

export function isScreenTag(value: string): value is ScreenTag {
  return (SCREEN_TAGS as readonly string[]).includes(value);
}

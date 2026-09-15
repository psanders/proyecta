/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { mapsUrl } from "../lib/format.js";
import { Icon } from "./ui/Icon.js";

/** "Ver en mapa ↗": opens Google Maps in a new tab, at the pin when there are coordinates. */
export function MapLink({
  label,
  coordinates
}: {
  label: string;
  coordinates?: { latitude: number; longitude: number } | null;
}) {
  return (
    <a
      href={mapsUrl(coordinates)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <Icon name="openInNew" className="size-3.5" />
    </a>
  );
}

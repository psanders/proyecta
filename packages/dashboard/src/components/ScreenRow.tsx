/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Link } from "react-router-dom";
import { PLACE_TYPE_LABELS, type PlaceType, type ScreenStatusView } from "@proyecta/common";
import { availabilitySummary } from "../lib/format.js";
import { strings } from "../strings.js";
import { StatusBadge } from "./StatusBadge.js";
import { Icon } from "./ui/Icon.js";

export interface ScreenRowData {
  id: string;
  name: string;
  city: string;
  placeType: string | null;
  address: string | null;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  status: ScreenStatusView;
  complete: boolean;
}

/** Pencil Dashboard/Screen Row: thumb, name, place · city, availability, status, chevron. */
export function ScreenRow({ screen }: { screen: ScreenRowData }) {
  const place = screen.placeType
    ? PLACE_TYPE_LABELS[screen.placeType as PlaceType]
    : screen.address;
  const availability = availabilitySummary(screen.availableDays, screen.startTime, screen.endTime);
  return (
    <Link
      to={`/pantallas/${screen.id}`}
      data-testid="screen-row"
      className="flex items-center justify-between gap-4 border border-border bg-card p-5 shadow-[0_1px_1.75px_#0000000d] hover:border-foreground/40"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary">
          <Icon name="tv" className="size-[22px]" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-foreground">{screen.name}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {[place, screen.city].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-6">
        <span className="text-[13px] text-muted-foreground">
          {availability ?? strings.screens.availabilityUnset}
        </span>
        <StatusBadge status={screen.status} />
        <Icon name="chevronRight" className="size-5 text-muted-foreground" />
      </div>
    </Link>
  );
}

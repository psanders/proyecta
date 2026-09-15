/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import type { CatalogScreenView, Orientation } from "@proyecta/common";
import { cn } from "../lib/cn.js";
import { formatCents } from "../lib/format.js";
import type { MessageId } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";
import { Pill } from "./AdBadges.js";
import { Icon } from "./ui/Icon.js";

/** Catalog screens a file of `orientation` can play on (screens without an orientation fit both). */
export function compatibleScreens(screens: CatalogScreenView[], orientation: Orientation) {
  return screens.filter((s) => s.orientation === null || s.orientation === orientation);
}

/**
 * Pencil advertiser-ad-new-screens: a checklist of compatible catalog screens with a city filter
 * and a note on how many were hidden for their orientation.
 */
export function ScreenPicker({
  screens,
  orientation,
  excludeIds = [],
  selected,
  onToggle
}: {
  screens: CatalogScreenView[];
  orientation: Orientation;
  excludeIds?: string[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { t, language } = useI18n();
  const [city, setCity] = useState("");
  const available = screens.filter((s) => !excludeIds.includes(s.id));
  const fitting = compatibleScreens(available, orientation);
  const hidden = available.length - fitting.length;
  const cities = [...new Set(fitting.map((s) => s.city))].sort();
  const shown = city ? fitting.filter((s) => s.city === city) : fitting;

  return (
    <div className="flex flex-col border border-border bg-card">
      {cities.length > 1 ? (
        <div className="flex justify-end px-5 py-3">
          <select
            aria-label={t("form.city")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 rounded-full border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("explore.allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {shown.map((screen) => {
        const checked = selected.includes(screen.id);
        return (
          <label
            key={screen.id}
            className="flex cursor-pointer items-center gap-3.5 border-t border-border px-5 py-3.5 first:border-t-0 hover:bg-secondary/40"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(screen.id)}
              className="size-4 accent-[var(--color-primary)]"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {screen.name}
                {screen.own ? <Pill tone="orange">{t("explore.own")}</Pill> : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {[
                  screen.city,
                  screen.placeType ? t(`placeType.${screen.placeType}` as MessageId) : null,
                  screen.resolution?.replace("x", "×")
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className={cn("flex flex-col items-end", checked && "text-foreground")}>
              <span className="font-mono text-sm">
                {formatCents(screen.ratePerFiveSecondsCents, language)}
              </span>
              <span className="text-xs text-muted-foreground">{t("adNew.per5")}</span>
            </span>
          </label>
        );
      })}
      {hidden > 0 ? (
        <p className="flex items-center gap-2 bg-secondary px-5 py-3 text-[13px] text-muted-foreground">
          <Icon name="info" className="size-4" />
          {hidden === 1 ? t("adNew.hidden.one") : t("adNew.hidden.other", { n: hidden })}
        </p>
      ) : null}
    </div>
  );
}

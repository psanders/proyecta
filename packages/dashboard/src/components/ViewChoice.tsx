/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { DASHBOARD_VIEWS, type DashboardView } from "@proyecta/common";
import { cn } from "../lib/cn.js";
import type { MessageId } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";
import { Icon, type IconName } from "./ui/Icon.js";

const ICONS: Record<DashboardView, IconName> = {
  SCREEN_OWNER: "tv",
  ADVERTISER: "campaign",
  BOTH: "syncAlt"
};

/**
 * Pencil onboarding-view-choice / workspace-settings-view: one radio card per dashboard view.
 * Stacked on the welcome step, side by side in Configuración.
 */
export function ViewChoice({
  value,
  onChange,
  layout = "stack",
  disabled
}: {
  value: DashboardView;
  onChange: (view: DashboardView) => void;
  layout?: "stack" | "row";
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      role="radiogroup"
      className={cn("flex gap-3", layout === "stack" ? "flex-col" : "flex-row")}
    >
      {DASHBOARD_VIEWS.map((view) => {
        const selected = view === value;
        return (
          <button
            key={view}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(view)}
            className={cn(
              "flex flex-1 items-start gap-3.5 border bg-card p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
              selected ? "border-2 border-primary" : "border-border hover:bg-secondary/40"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Icon
                name={ICONS[view]}
                className={cn("size-5", selected ? "text-primary" : "text-foreground")}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-foreground">
                {t(`view.${view}` as MessageId)}
              </span>
              <span className="text-[13px] leading-snug text-muted-foreground">
                {t(`view.${view}.body` as MessageId)}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "size-[18px] shrink-0 rounded-full border",
                selected ? "border-[5px] border-primary" : "border-border"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

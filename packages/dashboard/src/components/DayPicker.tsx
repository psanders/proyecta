/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { WEEKDAY_LABELS } from "@proyecta/common";
import { cn } from "../lib/cn.js";

/** Pencil Dashboard/Day Picker: seven round chips, selected ones filled dark. */
export function DayPicker({
  value,
  onChange,
  disabled
}: {
  value: number[];
  onChange?: (days: number[]) => void;
  disabled?: boolean;
}) {
  const toggle = (day: number) =>
    onChange?.(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b)
    );
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            disabled={disabled || !onChange}
            onClick={() => toggle(day)}
            className={cn(
              "flex size-10 items-center justify-center rounded-full font-mono text-xs font-medium transition disabled:cursor-default",
              selected
                ? "bg-foreground text-card"
                : "bg-secondary text-muted-foreground hover:bg-sidebar-accent"
            )}
          >
            {WEEKDAY_LABELS[day]}
          </button>
        );
      })}
    </div>
  );
}

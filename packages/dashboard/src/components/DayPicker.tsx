/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { cn } from "../lib/cn.js";
import type { MessageId } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";

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
  const { t } = useI18n();
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
            {t(`weekday.${day}` as MessageId)}
          </button>
        );
      })}
    </div>
  );
}

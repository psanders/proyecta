/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useId, type ReactNode } from "react";

/**
 * Pencil profile › Preferencias Card › Rows: label and hint on the left, the control on the right,
 * a divider between rows. The control gets the ids to label itself with.
 */
export function SettingRow({
  label,
  hint,
  children
}: {
  label: string;
  hint: string;
  children: (ids: { labelId: string; hintId: string }) => ReactNode;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      </div>
      <div className="shrink-0">{children({ labelId, hintId })}</div>
    </div>
  );
}

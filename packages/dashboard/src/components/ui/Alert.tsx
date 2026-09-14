/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

const TONES = {
  error: { box: "bg-error text-error-foreground", icon: "error" },
  success: { box: "bg-success text-success-foreground", icon: "checkCircle" },
  warning: { box: "bg-warning text-warning-foreground", icon: "warning" },
  info: { box: "bg-info text-info-foreground", icon: "info" }
} as const;

/** Pencil Alert/* (Lunaris). */
export function Alert({
  tone,
  children,
  className
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 px-4 py-3 text-sm", TONES[tone].box, className)}
    >
      <Icon name={TONES[tone].icon} className="mt-px size-4" />
      <div>{children}</div>
    </div>
  );
}

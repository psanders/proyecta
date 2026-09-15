/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import { Icon, type IconName } from "./Icon.js";

/** Pencil Card (Lunaris): white, 1 px border, subtle shadow, square corners. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border border-border bg-card shadow-[0_1px_1.75px_#0000000d]", className)}>
      {children}
    </div>
  );
}

/** Dashboard/Section Card: header (title + hint) and content, as in the screen detail and forms. */
export function SectionCard({
  title,
  icon,
  hint,
  actions,
  children,
  className
}: {
  title: string;
  icon?: IconName;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            {icon ? <Icon name={icon} className="size-4 text-muted-foreground" /> : null}
            {title}
          </h2>
          {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-4 p-6">{children}</div>
    </Card>
  );
}

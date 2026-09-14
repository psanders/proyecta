/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./ui/Icon.js";

/** Pencil Dashboard/Page Header: title (JetBrains Mono 24/500), subtitle, actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  badge
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 truncate font-mono text-2xl font-medium text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Pencil Dashboard/Back Link. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
    >
      <Icon name="arrowBack" className="size-4" />
      {label}
    </Link>
  );
}

/** Pencil Dashboard/Stat Card. */
export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 border border-border bg-card p-6 shadow-[0_1px_1.75px_#0000000d]">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[28px] leading-tight font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Pencil Dashboard/Key Value Row (screen detail). */
export function KeyValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

/** Pencil screen-dashboard-empty: icon, title, body, action. */
export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
        <Icon name="tv" className="size-7" />
      </div>
      <h2 className="font-mono text-lg font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

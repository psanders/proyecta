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
  subtitle?: ReactNode;
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
        {subtitle ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">{subtitle}</div>
        ) : null}
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

/** Pencil Dashboard/Stat Card: compact 68 px card, label over value. */
export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex h-[68px] flex-1 flex-col justify-center border border-border bg-card px-6 shadow-[0_1px_1.75px_#0000000d]">
      <span className="text-[13px] leading-tight text-muted-foreground">{label}</span>
      <span className="font-mono text-[28px] leading-none font-medium text-foreground">
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

/** Pencil screen-dashboard-empty: centered icon, title, body and action, no card. */
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
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
        <Icon name="tv" className="size-6" />
      </div>
      <h2 className="font-mono text-base font-medium">{title}</h2>
      <p className="max-w-xs text-[13px] text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

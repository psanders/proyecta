/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ReactNode } from "react";
import { strings } from "../strings.js";
import { Icon } from "./ui/Icon.js";

/** Pencil Dashboard/Auth Layout (frame login): dark brand panel (560 px) + centered form (380 px). */
export function AuthLayout({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-[560px] shrink-0 flex-col justify-between bg-brand-panel p-16 lg:flex">
        <Brand />
        <div className="flex w-[400px] flex-col gap-4">
          <p className="font-mono text-[32px] leading-[1.2] font-medium text-white">
            {strings.authHeadline}
          </p>
          <p className="text-[15px] leading-normal text-brand-muted">{strings.authSubtext}</p>
        </div>
        <p className="text-[13px] text-muted-foreground">{strings.copyright}</p>
      </aside>
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="flex w-[380px] max-w-full flex-col gap-6">
          <div className="lg:hidden">
            <Brand dark />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-mono text-2xl font-medium text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Brand({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name="tv" className="size-7 text-primary" />
      <span className={`font-mono text-lg font-bold ${dark ? "text-foreground" : "text-white"}`}>
        {strings.brand}
      </span>
    </div>
  );
}

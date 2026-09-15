/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Small building blocks shared by every section (Web/Eyebrow, buttons, logo, pills in Pencil).
 */
import type { ReactNode } from "react";
import clsx from "clsx";
import { Icon } from "./Icon.js";
import { strings } from "../strings.js";

type Tone = "stage" | "paper";

export function Eyebrow({ children, tone = "stage" }: { children: ReactNode; tone?: Tone }) {
  return (
    <p className="flex items-center gap-2.5">
      <span aria-hidden className="size-2 rounded-full bg-signal" />
      <span
        className={clsx(
          "font-mono text-xs font-medium tracking-[2.4px]",
          tone === "stage" ? "text-stage-muted" : "text-ink-muted"
        )}
      >
        {children}
      </span>
    </p>
  );
}

export function H2({
  children,
  tone = "stage",
  className
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <h2
      className={clsx(
        "font-mono text-[28px] leading-8 font-semibold tracking-[-1px] lg:text-[44px] lg:leading-[49px]",
        tone === "stage" ? "text-white" : "text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost";

/** Pill link styled as the Pencil Button components. `size="lg"` is the 56px hero/final CTA. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={clsx(
        "inline-flex h-12 items-center justify-center rounded-full px-6 font-mono text-[15px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        size === "lg" && "lg:h-14 lg:px-7",
        size === "md" && "lg:text-sm",
        variant === "primary" && "bg-signal text-ink hover:bg-[#f07448]",
        variant === "outline" &&
          "border border-white/25 bg-stage/40 text-white shadow-[0_1px_1.75px_#0000000d] hover:bg-white/10",
        variant === "ghost" && "text-white hover:text-stage-link",
        className
      )}
    >
      {children}
    </a>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("flex items-center gap-2 lg:gap-2.5", className)}>
      <Icon name="tv" className="size-5 text-signal lg:size-6" />
      <span className="font-mono text-[15px] font-bold tracking-[1px] text-white lg:text-lg">
        {strings.brand}
      </span>
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-white/20 px-2.5 py-1 font-mono text-[10px] tracking-[1.5px] text-stage-soft">
      {children}
    </span>
  );
}

/** Section wrapper with the Pencil gutters (20px mobile, 120px desktop) and vertical rhythm. */
export function Section({
  id,
  tone,
  className,
  children
}: {
  id?: string;
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "px-5 py-14 md:px-10 lg:py-[140px] xl:px-[120px]",
        tone === "stage" ? "bg-stage" : "bg-paper",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </section>
  );
}

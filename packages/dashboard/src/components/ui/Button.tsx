/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn.js";
import { Icon, type IconName } from "./Icon.js";

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:brightness-95",
  outline: "border border-border bg-card text-foreground hover:bg-secondary",
  secondary: "bg-secondary text-foreground hover:bg-sidebar-accent",
  ghost: "text-foreground hover:bg-secondary",
  destructive: "bg-destructive text-primary-foreground hover:brightness-95"
};

/** Pencil Button/* (Lunaris): 40 px pill, JetBrains Mono 14/500. */
export function Button({
  variant = "default",
  icon,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 font-mono text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon name="spinner" className="size-5 animate-spin" />
      ) : icon ? (
        <Icon name={icon} />
      ) : null}
      {children}
    </button>
  );
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";
import { Icon, type IconName } from "./Icon.js";
import { strings } from "../../strings.js";

export interface MoreMenuItem {
  label: string;
  icon: IconName;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
}

export type MoreMenuEntry = MoreMenuItem | "divider";

/** Pencil Dashboard/More Menu: ghost icon trigger + right-aligned dropdown, as in AppSidebar's account menu. */
export function MoreMenu({ items }: { items: MoreMenuEntry[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const menuItems = Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ??
          []
      );
      if (menuItems.length === 0) return;
      event.preventDefault();
      const index = menuItems.findIndex((el) => el === document.activeElement);
      const next =
        event.key === "ArrowDown"
          ? menuItems[(index + 1) % menuItems.length]
          : menuItems[(index - 1 + menuItems.length) % menuItems.length];
      next?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={strings.detail.moreActions}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary"
      >
        <Icon name="moreVert" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-10 mt-1 flex w-64 flex-col border border-border bg-card py-2 shadow-lg"
        >
          {items.map((item, index) =>
            item === "divider" ? (
              <div key={`divider-${index}`} className="my-2 border-t border-border" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex flex-col gap-0.5 px-4 py-2 text-left text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:hover:bg-transparent",
                  item.destructive ? "text-destructive" : "text-foreground",
                  item.disabled ? "opacity-50" : null
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon name={item.icon} className="size-4" />
                  {item.label}
                </span>
                {item.disabled && item.hint ? (
                  <span className="pl-6 text-xs text-muted-foreground">{item.hint}</span>
                ) : null}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

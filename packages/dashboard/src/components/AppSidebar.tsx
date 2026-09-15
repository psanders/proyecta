/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS, type WorkspaceRole } from "@proyecta/common";
import { cn } from "../lib/cn.js";
import { session } from "../lib/session.js";
import { trpc } from "../lib/trpc.js";
import { useWorkspace } from "../lib/useWorkspace.js";
import { strings } from "../strings.js";
import { Icon, type IconName } from "./ui/Icon.js";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: strings.nav.screens, icon: "tv" },
  { to: "/equipo", label: strings.nav.team, icon: "group" },
  { to: "/perfil", label: strings.nav.profile, icon: "person" }
];

const COLLAPSED_KEY = "proyecta.dashboard.navCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Vallas del Cibao" → "VC": skips lowercase connectors (de, del, y…). */
export function initials(name: string | undefined): string {
  const words = (name ?? "").split(/\s+/).filter(Boolean);
  const significant = words.filter((word) => word[0] !== word[0]!.toLowerCase());
  return (significant.length > 0 ? significant : words)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Pencil Dashboard/Nav/Expanded and Dashboard/Nav/Collapsed. Expanded: logo with the collapse
 * button to its right. Collapsed: a 72 px icon rail with the expand button above the logo icon.
 * The choice is remembered per browser.
 */
export function AppSidebar() {
  const { workspaces, active } = useWorkspace();
  const profile = trpc.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch {
        // Private mode: the preference just isn't remembered.
      }
      return !value;
    });
    setMenuOpen(false);
  };
  const switchTo = (accessKeyId: string) => {
    session.update({ workspace: accessKeyId });
    setMenuOpen(false);
    void utils.invalidate();
    navigate("/");
  };
  const signOut = () => {
    session.set(null);
    queryClient.clear();
    navigate("/ingresar");
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 border-b border-sidebar-border pt-4 pb-5">
          <PanelButton icon="leftPanelOpen" label={strings.nav.expand} onClick={toggle} />
          <Icon name="tv" className="size-7 text-primary" />
        </div>
      ) : (
        <div className="flex h-[88px] items-center justify-between border-b border-sidebar-border pr-4 pl-8">
          <div className="flex items-center gap-2">
            <Icon name="tv" className="size-7 text-primary" />
            <span className="font-mono text-lg leading-none font-bold text-primary">
              {strings.brand}
            </span>
          </div>
          <PanelButton icon="leftPanelClose" label={strings.nav.collapse} onClick={toggle} />
        </div>
      )}

      <nav className={cn("flex flex-1 flex-col gap-1", collapsed ? "items-center" : "px-4")}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-full text-base",
                collapsed ? "size-12 justify-center" : "gap-4 px-4 py-3",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60"
              )
            }
          >
            <Icon name={item.icon} className="size-6" />
            {collapsed ? null : item.label}
          </NavLink>
        ))}
      </nav>

      <div className={cn("relative pb-6", collapsed ? "flex justify-center" : "px-4")}>
        {menuOpen ? (
          <div
            role="menu"
            className={cn(
              "absolute z-20 flex w-60 flex-col border border-border bg-card py-2 shadow-lg",
              collapsed ? "bottom-6 left-full ml-2" : "right-4 bottom-full left-4 mb-2 w-auto"
            )}
          >
            {workspaces.length > 1 ? (
              <p className="px-4 pt-1 pb-2 text-xs text-muted-foreground">
                {strings.nav.switchBusiness}
              </p>
            ) : null}
            {workspaces.map((w) => (
              <button
                key={w.accessKeyId}
                role="menuitem"
                onClick={() => switchTo(w.accessKeyId)}
                className="flex items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-secondary"
              >
                <span className="flex flex-col">
                  <span className="text-foreground">{w.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[w.role as WorkspaceRole]}
                  </span>
                </span>
                {w.accessKeyId === active?.accessKeyId ? (
                  <Icon name="check" className="size-4" />
                ) : null}
              </button>
            ))}
            <div className="my-2 border-t border-border" />
            <button
              role="menuitem"
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-secondary"
            >
              <Icon name="logout" className="size-4" />
              {strings.nav.signOut}
            </button>
          </div>
        ) : null}
        {collapsed ? (
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={strings.nav.account}
            title={active?.name}
            className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent font-mono text-[13px] font-medium text-foreground"
          >
            {initials(active?.name)}
          </button>
        ) : (
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left hover:bg-sidebar-accent/60"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base text-foreground">{active?.name ?? "…"}</span>
              <span className="truncate text-sm text-muted-foreground">
                {profile.data?.email ?? ""}
              </span>
            </span>
            <Icon name="chevronDown" className="size-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </aside>
  );
}

function PanelButton({
  icon,
  label,
  onClick
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
    >
      <Icon name={icon} className="size-5" />
    </button>
  );
}

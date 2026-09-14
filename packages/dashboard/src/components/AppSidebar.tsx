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
import { Brand } from "./AuthLayout.js";
import { Icon, type IconName } from "./ui/Icon.js";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: strings.nav.screens, icon: "tv" },
  { to: "/equipo", label: strings.nav.team, icon: "group" },
  { to: "/perfil", label: strings.nav.profile, icon: "person" }
];

/** Pencil Dashboard/App Sidebar (Lunaris Sidebar): logo, navigation, business + account footer. */
export function AppSidebar() {
  const { workspaces, active } = useWorkspace();
  const profile = trpc.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
    <aside className="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-[88px] items-center border-b border-sidebar-border px-8">
        <Brand dark />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 rounded-full px-4 py-3 text-base",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60"
              )
            }
          >
            <Icon name={item.icon} className="size-6" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="relative px-4 pb-6">
        {menuOpen ? (
          <div
            className="absolute right-4 bottom-full left-4 mb-2 flex flex-col border border-border bg-card py-2 shadow-lg"
            role="menu"
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
      </div>
    </aside>
  );
}

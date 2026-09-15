/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { DashboardView, WorkspaceRole } from "@proyecta/common";
import { cn } from "../lib/cn.js";
import { session } from "../lib/session.js";
import { trpc } from "../lib/trpc.js";
import { useDashboardView } from "../lib/useDashboardView.js";
import { usePendingRequests } from "../lib/usePendingRequests.js";
import { useWorkspace } from "../lib/useWorkspace.js";
import type { MessageId } from "../lib/i18n.js";
import { useI18n } from "../lib/useI18n.js";
import { Icon, type IconName } from "./ui/Icon.js";

interface NavItem {
  to: string;
  label: MessageId;
  icon: IconName;
  end?: boolean;
  /** Shows the pending request count. */
  countsRequests?: boolean;
}

interface NavGroup {
  heading: MessageId | null;
  items: NavItem[];
}

const SCREENS: NavItem[] = [
  { to: "/", label: "nav.screens", icon: "tv", end: true },
  { to: "/requests", label: "nav.requests", icon: "inbox", countsRequests: true }
];
const ADS: NavItem[] = [
  { to: "/explore", label: "nav.explore", icon: "search" },
  { to: "/ads", label: "nav.ads", icon: "campaign" },
  { to: "/assets", label: "nav.assets", icon: "permMedia" }
];
const SETTINGS: NavGroup = {
  heading: null,
  items: [{ to: "/settings", label: "nav.settings", icon: "settings" }]
};

/** The menu for a dashboard view: one side without headings, or both sides as labeled groups. */
export function navGroups(view: DashboardView): NavGroup[] {
  if (view === "SCREEN_OWNER") return [{ heading: null, items: SCREENS }, SETTINGS];
  if (view === "ADVERTISER") return [{ heading: null, items: ADS }, SETTINGS];
  return [
    { heading: "nav.groupScreens", items: SCREENS },
    { heading: "nav.groupAds", items: ADS },
    SETTINGS
  ];
}

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
 * The choice is remembered per browser. The footer opens Dashboard/Account Menu.
 */
export function AppSidebar() {
  const { t } = useI18n();
  const { workspaces, active } = useWorkspace();
  const { view } = useDashboardView();
  const groups = navGroups(view);
  const pendingRequests = usePendingRequests();
  const profile = trpc.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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
  const goTo = (path: string) => {
    setMenuOpen(false);
    navigate(path);
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
    navigate("/sign-in");
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
          <PanelButton icon="leftPanelOpen" label={t("nav.expand")} onClick={toggle} />
          <Icon name="tv" className="size-7 text-primary" />
        </div>
      ) : (
        <div className="flex h-[88px] items-center justify-between border-b border-sidebar-border pr-4 pl-8">
          <div className="flex items-center gap-2">
            <Icon name="tv" className="size-7 text-primary" />
            <span className="font-mono text-lg leading-none font-bold text-primary">
              {t("brand")}
            </span>
          </div>
          <PanelButton icon="leftPanelClose" label={t("nav.collapse")} onClick={toggle} />
        </div>
      )}

      <nav className={cn("flex flex-1 flex-col gap-1", collapsed ? "items-center" : "px-4")}>
        {groups.map((group, index) => (
          <div
            key={group.heading ?? `group-${index}`}
            role="group"
            aria-label={group.heading ? t(group.heading) : undefined}
            className={cn(
              "flex flex-col gap-1",
              collapsed && "items-center",
              index > 0 && (group.heading || !collapsed) && "mt-2",
              index > 0 && collapsed && "border-t border-sidebar-border pt-2"
            )}
          >
            {group.heading && !collapsed ? (
              <span className="px-4 pt-3 pb-1 font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
                {t(group.heading).toUpperCase()}
              </span>
            ) : null}
            {!group.heading && index > 0 && !collapsed ? (
              <span aria-hidden className="mx-4 mb-1 h-px bg-sidebar-border" />
            ) : null}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? t(item.label) : undefined}
                aria-label={collapsed ? t(item.label) : undefined}
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
                <span className="relative">
                  <Icon name={item.icon} className="size-6" />
                  {collapsed && item.countsRequests && pendingRequests > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                {collapsed ? null : (
                  <>
                    <span className="flex-1">{t(item.label)}</span>
                    {item.countsRequests && pendingRequests > 0 ? (
                      <span
                        data-testid="requests-count"
                        className="rounded-full bg-primary px-2 py-0.5 font-mono text-xs text-primary-foreground"
                      >
                        {pendingRequests}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div
        ref={menuRef}
        className={cn("relative pb-6", collapsed ? "flex justify-center" : "px-4")}
      >
        {menuOpen ? (
          <AccountMenu
            collapsed={collapsed}
            profile={profile.data}
            workspaces={workspaces}
            active={active}
            onNavigate={goTo}
            onSwitch={switchTo}
            onSignOut={signOut}
          />
        ) : null}
        {collapsed ? (
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t("nav.account")}
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
            aria-label={t("nav.account")}
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

interface AccountMenuWorkspace {
  accessKeyId: string;
  name: string;
  role: string;
}

/** Pencil Dashboard/Account Menu: 260 px popover with profile header, personal items and businesses. */
function AccountMenu({
  collapsed,
  profile,
  workspaces,
  active,
  onNavigate,
  onSwitch,
  onSignOut
}: {
  collapsed: boolean;
  profile: { name: string; email: string } | undefined;
  workspaces: AccountMenuWorkspace[];
  active: AccountMenuWorkspace | null;
  onNavigate: (path: string) => void;
  onSwitch: (accessKeyId: string) => void;
  onSignOut: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="menu"
      className={cn(
        "absolute z-20 flex w-[260px] flex-col border border-border bg-card py-2 shadow-lg",
        collapsed ? "bottom-0 left-full ml-2" : "right-4 bottom-full left-4 mb-2"
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-medium text-foreground">
          {initials(profile?.name)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {profile?.name ?? "…"}
          </span>
          <span className="truncate text-xs text-muted-foreground">{profile?.email ?? ""}</span>
        </span>
      </div>
      <div className="my-2 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        onClick={() => onNavigate("/profile")}
        className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
      >
        <Icon name="person" className="size-4 text-muted-foreground" />
        {t("nav.profile")}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onNavigate("/team")}
        className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
      >
        <Icon name="group" className="size-4 text-muted-foreground" />
        {t("nav.team")}
      </button>
      <div className="my-2 border-t border-border" />
      <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground">{t("nav.businesses")}</p>
      {workspaces.map((w) => (
        <button
          key={w.accessKeyId}
          type="button"
          role="menuitem"
          onClick={() => onSwitch(w.accessKeyId)}
          className="flex items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-secondary"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{w.name}</span>
            <span className="text-xs text-muted-foreground">
              {t(`role.${w.role as WorkspaceRole}`)}
            </span>
          </span>
          {w.accessKeyId === active?.accessKeyId ? (
            <Icon name="check" className="size-4 shrink-0 text-foreground" />
          ) : null}
        </button>
      ))}
      <div className="my-2 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        onClick={onSignOut}
        className="flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive hover:bg-secondary"
      >
        <Icon name="logout" className="size-4" />
        {t("nav.signOut")}
      </button>
    </div>
  );
}

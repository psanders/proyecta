/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { ThemePreference } from "../lib/theme.js";
import { cn } from "../lib/cn.js";
import { useThemePreference } from "../lib/useTheme.js";
import { strings } from "../strings.js";
import { Icon, type IconName } from "./ui/Icon.js";

const OPTIONS: { value: ThemePreference; icon: IconName }[] = [
  { value: "system", icon: "desktop" },
  { value: "light", icon: "lightMode" },
  { value: "dark", icon: "darkMode" }
];

/** Pencil profile › Apariencia Card › Theme Tabs: segmented Sistema / Claro / Oscuro, applied on click. */
export function ThemeSwitch() {
  const [preference, setPreference] = useThemePreference();
  return (
    <div
      role="radiogroup"
      aria-label={strings.profile.appearance}
      className="flex w-fit gap-0.5 rounded-full bg-secondary p-1"
    >
      {OPTIONS.map(({ value, icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px]",
              selected
                ? "bg-card font-medium text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon name={icon} className="size-4" />
            {strings.profile.themeOptions[value]}
          </button>
        );
      })}
    </div>
  );
}

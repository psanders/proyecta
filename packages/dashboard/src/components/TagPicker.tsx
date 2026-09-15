/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  MAX_SCREEN_TAGS,
  SCREEN_TAG_GROUP_IDS,
  SCREEN_TAG_GROUPS,
  type ScreenTag
} from "@proyecta/common";
import { cn } from "../lib/cn.js";
import { useI18n } from "../lib/useI18n.js";

const chip = "rounded-full px-3 py-1.5 text-[13px] font-medium transition";
const selectedChip = "bg-foreground text-card";

/** Pencil add-screen Etiquetas card: the tag catalog as toggle chips, grouped, up to 10. */
export function TagPicker({
  value,
  onChange,
  error
}: {
  value: ScreenTag[];
  onChange: (tags: ScreenTag[]) => void;
  error?: string;
}) {
  const { t } = useI18n();
  const full = value.length >= MAX_SCREEN_TAGS;
  const toggle = (tag: ScreenTag) =>
    onChange(value.includes(tag) ? value.filter((v) => v !== tag) : [...value, tag]);
  return (
    <div className="flex flex-col gap-4">
      {SCREEN_TAG_GROUP_IDS.map((group) => (
        <div
          key={group}
          className="flex flex-col gap-2"
          role="group"
          aria-label={t(`tagGroup.${group}`)}
        >
          <span className="text-sm font-medium text-foreground">{t(`tagGroup.${group}`)}</span>
          <div className="flex flex-wrap gap-2">
            {SCREEN_TAG_GROUPS[group].map((tag) => {
              const selected = value.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && full}
                  onClick={() => toggle(tag)}
                  className={cn(
                    chip,
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? selectedChip
                      : "bg-secondary text-muted-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {t(`tag.${tag}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** The screen's tags as read-only chips (screen detail). */
export function TagList({ tags }: { tags: ScreenTag[] }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap justify-end gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className={cn(chip, "bg-secondary px-2.5 py-1 text-xs text-foreground")}>
          {t(`tag.${tag}`)}
        </span>
      ))}
    </span>
  );
}

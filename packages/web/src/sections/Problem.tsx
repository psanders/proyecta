/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import clsx from "clsx";
import { Icon } from "../components/Icon.js";
import type { IconName } from "../components/Icon.js";
import { Eyebrow, H2, Section, Tag } from "../components/ui.js";
import { strings } from "../strings.js";

interface Row {
  icon: IconName;
  text: string;
  tag?: string;
}

function CompareCard({
  title,
  rows,
  dark
}: {
  title: string;
  rows: readonly Row[];
  dark?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-1 flex-col gap-1 rounded-2xl p-7 lg:gap-4 lg:p-10",
        dark ? "bg-stage" : "border border-paper-line"
      )}
    >
      <h3
        className={clsx(
          "font-mono text-xs font-medium tracking-[2px] lg:text-[13px]",
          dark ? "text-signal" : "text-ink-muted"
        )}
      >
        {title}
      </h3>
      <ul>
        {rows.map((row) => (
          <li
            key={row.text}
            className={clsx(
              "flex flex-col gap-2 border-b py-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-5 lg:py-[22px]",
              dark ? "border-stage-line" : "border-paper-line"
            )}
          >
            <span className="flex flex-1 items-center gap-3.5 lg:gap-5">
              <Icon
                name={row.icon}
                className={clsx("size-5 lg:size-6", dark ? "text-signal" : "text-subtle")}
              />
              <span
                className={clsx(
                  "flex-1 text-[15px] lg:text-lg",
                  dark ? "text-white" : "text-ink-muted"
                )}
              >
                {row.text}
              </span>
            </span>
            {row.tag && (
              <span>
                <Tag>{row.tag}</Tag>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Problem() {
  const t = strings.problem;
  return (
    <Section tone="paper">
      <div className="flex flex-col gap-10 lg:gap-[72px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex max-w-[760px] flex-col gap-4 lg:gap-6">
            <Eyebrow tone="paper">{t.eyebrow}</Eyebrow>
            <H2 tone="paper">{t.title}</H2>
          </div>
          <p className="text-[15px] leading-[23px] text-ink-muted lg:w-[380px] lg:shrink-0 lg:text-[17px] lg:leading-[26px]">
            {t.aside}
          </p>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          <CompareCard title={t.todayTitle} rows={t.today} />
          <CompareCard title={t.withTitle} rows={t.with} dark />
        </div>
      </div>
    </Section>
  );
}

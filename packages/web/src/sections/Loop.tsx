/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Eyebrow, H2, Section, Tag } from "../components/ui.js";
import { strings } from "../strings.js";

/** The 12 slots of the ring in Pencil's "Loop Viz" (520×520), clockwise from 12 o'clock. */
const SLOTS = [
  "M264.538 0.04C307.096 0.782 348.822 11.963 386.051 32.599L350.756 96.271C323.952 81.413 293.909 73.363 263.267 72.829L264.538 0.04Z",
  "M393.91 37.137C430.395 59.059 460.941 89.605 482.863 126.09L420.462 163.585C404.677 137.315 382.685 115.323 356.415 99.538L393.91 37.137Z",
  "M487.401 133.949C508.037 171.178 519.218 212.904 519.96 255.462L447.171 256.733C446.637 226.091 438.587 196.048 423.729 169.244L487.401 133.949Z",
  "M519.96 264.538C519.218 307.096 508.037 348.822 487.401 386.051L423.729 350.756C438.587 323.952 446.637 293.909 447.171 263.267L519.96 264.538Z",
  "M482.863 393.91C460.941 430.395 430.395 460.941 393.91 482.863L356.415 420.462C382.685 404.677 404.677 382.685 420.462 356.415L482.863 393.91Z",
  "M386.051 487.401C348.822 508.037 307.096 519.218 264.538 519.96L263.267 447.171C293.909 446.637 323.952 438.587 350.756 423.729L386.051 487.401Z",
  "M255.462 519.96C212.904 519.218 171.178 508.037 133.949 487.401L169.244 423.729C196.048 438.587 226.091 446.637 256.733 447.171L255.462 519.96Z",
  "M126.09 482.863C89.605 460.941 59.059 430.395 37.137 393.91L99.538 356.415C115.323 382.685 137.315 404.677 163.585 420.462L126.09 482.863Z",
  "M32.599 386.051C11.963 348.822 0.782 307.096 0.04 264.538L72.829 263.267C73.363 293.909 81.413 323.952 96.271 350.756L32.599 386.051Z",
  "M0.04 255.462C0.782 212.904 11.963 171.178 32.599 133.949L96.271 169.244C81.413 196.048 73.363 226.091 72.829 256.733L0.04 255.462Z",
  "M37.137 126.09C59.059 89.605 89.605 59.059 126.09 37.137L163.585 99.538C137.315 115.323 115.323 137.315 99.538 163.585L37.137 126.09Z",
  "M133.949 32.599C171.178 11.963 212.904 0.782 255.462 0.04L256.733 72.829C226.091 73.363 196.048 81.413 169.244 96.271L133.949 32.599Z"
];

const YOURS = "#EC5E2B";
const OTHERS = "#111111";
const OWNER = "#CBCCC9";
const slotColor = (index: number) => (index === 2 ? YOURS : index >= 10 ? OWNER : OTHERS);

function Ring() {
  const t = strings.loop;
  return (
    <div className="relative size-[260px] lg:size-[400px] xl:size-[520px]">
      <svg viewBox="0 0 520 520" className="size-full" role="img" aria-label={t.ringAria}>
        {SLOTS.map((d, index) => (
          <path key={d} d={d} fill={slotColor(index)} />
        ))}
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="font-mono text-[28px] font-semibold tracking-[-1px] text-ink lg:text-5xl">
          {t.ringNum}
        </span>
        <span className="font-mono text-[11px] tracking-[2px] text-ink-muted lg:text-xs lg:tracking-[2.4px]">
          {t.ringLabel}
        </span>
      </div>
    </div>
  );
}

export function Loop() {
  const t = strings.loop;
  const legend = [
    { color: YOURS, label: t.legend.yours },
    { color: OTHERS, label: t.legend.others },
    { color: OWNER, label: t.legend.owner }
  ];
  return (
    <Section tone="paper">
      <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16 xl:gap-24">
        <div className="flex w-full flex-1 flex-col gap-5 lg:gap-7">
          <Eyebrow tone="paper">{t.eyebrow}</Eyebrow>
          <H2 tone="paper">
            {t.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </H2>
          <p className="text-[15px] leading-6 text-ink-muted lg:text-[17px] lg:leading-[27px]">
            {t.body}
          </p>
          <dl className="flex flex-col rounded-2xl bg-stage px-5 py-1 lg:px-7 lg:py-2">
            {t.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-stage-line py-4 lg:py-[18px]"
              >
                <dt className="text-sm text-stage-muted lg:text-[15px]">{row.label}</dt>
                <dd className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-[15px] font-medium text-white lg:text-base">
                    {row.main}
                  </span>
                  <span className="font-mono text-[11px] text-subtle lg:text-xs">{row.sub}</span>
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-5 lg:py-[22px]">
              <dt className="flex flex-col items-start gap-1.5">
                <span className="text-sm text-white lg:text-[15px]">{t.resultLabel}</span>
                <Tag>{t.resultTag}</Tag>
              </dt>
              <dd className="flex flex-col items-end">
                <span className="font-mono text-4xl font-semibold tracking-[-1px] text-signal lg:text-[44px]">
                  {t.resultNum}
                </span>
                <span className="font-mono text-[11px] text-stage-muted lg:text-xs">
                  {t.resultUnit}
                </span>
              </dd>
            </div>
          </dl>
          <p className="text-[13px] leading-5 text-ink-muted lg:text-sm lg:leading-[21px]">
            {t.note}
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-7 lg:w-auto lg:shrink-0 lg:gap-10">
          <Ring />
          <ul className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-7">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-ink-muted">
                <span
                  aria-hidden
                  className="size-3 rounded-[3px]"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

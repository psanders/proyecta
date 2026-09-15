/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import searchShot from "../assets/app-buscar-pantallas-v2.webp";
import { Eyebrow, H2, Section } from "../components/ui.js";
import { strings } from "../strings.js";

export function Product() {
  const t = strings.product;
  return (
    <Section tone="stage">
      <div className="flex flex-col items-center gap-10 lg:gap-16">
        <div className="flex max-w-[820px] flex-col items-center gap-4 lg:gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <H2 className="text-center">{t.title}</H2>
        </div>
        <div className="relative h-[280px] w-full max-w-[1040px] overflow-hidden sm:h-[420px] lg:h-[600px]">
          <div className="overflow-hidden rounded-xl border border-stage-line-2 bg-stage-3 shadow-[0_30px_60px_-20px_#00000099]">
            <div className="flex h-9 items-center gap-1.5 border-b border-stage-line-2 px-3.5">
              {[0, 1, 2].map((dot) => (
                <span key={dot} aria-hidden className="size-2.5 rounded-full bg-[#3A3A3A]" />
              ))}
              <span className="flex-1 pr-10 text-center font-mono text-[11px] text-subtle">
                {t.url}
              </span>
            </div>
            <img
              src={searchShot}
              alt={t.shotAlt}
              width={2880}
              height={2200}
              loading="lazy"
              className="block w-full"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-stage/0 to-stage lg:h-60"
          />
        </div>
        <ul className="flex w-full max-w-[1040px] flex-col gap-7 lg:flex-row lg:gap-12">
          {t.features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-1 flex-col gap-1.5 lg:items-center lg:gap-2 lg:text-center"
            >
              <span className="font-mono text-base font-medium text-white lg:text-[17px]">
                {feature.title}
              </span>
              <span className="text-sm leading-[21px] text-stage-muted lg:text-[15px] lg:leading-[23px]">
                {feature.body}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

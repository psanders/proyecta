/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { DraggableNetworkMap, StaticNetworkMap } from "../components/NetworkMap.js";
import { Eyebrow, H2, Section } from "../components/ui.js";
import { ANCHORS } from "../links.js";
import { strings } from "../strings.js";

export function Network() {
  const t = strings.network;
  return (
    <Section id={ANCHORS.red} tone="paper">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
        <div className="flex w-full flex-col gap-5 lg:w-[520px] lg:shrink lg:gap-7">
          <Eyebrow tone="paper">{t.eyebrow}</Eyebrow>
          <H2 tone="paper">{t.title}</H2>
          <p className="text-[15px] leading-6 text-ink-muted lg:text-[17px] lg:leading-[27px]">
            {t.body}
          </p>
          <ul className="flex flex-wrap gap-1.5 lg:gap-2">
            {t.types.map((type) => (
              <li
                key={type}
                className="rounded-full border border-paper-line bg-white px-3 py-1.5 text-[13px] text-ink lg:px-3.5 lg:py-[7px] lg:font-mono"
              >
                {type}
              </li>
            ))}
          </ul>
        </div>
        <DraggableNetworkMap className="w-full lg:hidden" />
        <StaticNetworkMap className="hidden flex-1 lg:block" />
      </div>
    </Section>
  );
}

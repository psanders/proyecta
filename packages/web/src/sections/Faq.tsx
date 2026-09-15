/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Icon } from "../components/Icon.js";
import { Eyebrow, H2, Section } from "../components/ui.js";
import { ANCHORS } from "../links.js";
import { strings } from "../strings.js";

export function Faq() {
  const t = strings.faq;
  return (
    <Section id={ANCHORS.faq} tone="stage">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-16 xl:gap-24">
        <div className="flex flex-col gap-4 lg:w-[420px] lg:shrink-0 lg:gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <H2>{t.title}</H2>
          <p className="text-[15px] leading-[23px] text-stage-muted lg:text-[17px] lg:leading-[26px]">
            {t.body}
          </p>
        </div>
        <div className="flex-1 border-t border-stage-line-2">
          {t.items.map((item, index) => (
            <details key={item.q} open={index === 0} className="group border-b border-stage-line-2">
              <summary className="flex list-none items-start justify-between gap-[18px] py-5 lg:items-center lg:py-6">
                <span className="flex-1 font-mono text-base leading-[22px] font-medium text-white lg:text-lg lg:leading-[27px]">
                  {item.q}
                </span>
                <Icon
                  name="chevronDown"
                  className="mt-0.5 size-4 text-white transition-transform group-open:rotate-180 lg:mt-0"
                />
              </summary>
              <p className="pb-4 text-sm leading-[22px] text-stage-answer lg:text-base lg:leading-[25px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

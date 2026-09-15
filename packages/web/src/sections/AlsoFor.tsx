/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Icon } from "../components/Icon.js";
import type { IconName } from "../components/Icon.js";
import { Eyebrow, H2, Section } from "../components/ui.js";
import { ANCHORS, CONTACT_URL } from "../links.js";
import { strings } from "../strings.js";

interface CardProps {
  id: string;
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly string[];
  link: string;
}

function Card({ id, icon, eyebrow, title, body, points, link }: CardProps) {
  return (
    <article
      id={id}
      className="flex flex-1 scroll-mt-20 flex-col gap-5 rounded-[20px] border border-stage-line bg-stage-2 p-7 lg:gap-7 lg:p-12"
    >
      <div className="flex items-center justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Icon name={icon} className="size-7 text-white lg:size-8" />
      </div>
      <h3 className="font-mono text-[22px] leading-[26px] font-semibold tracking-[-0.5px] text-white lg:min-h-[70px] lg:text-[30px] lg:leading-[35px]">
        {title}
      </h3>
      <p className="text-sm leading-[22px] text-stage-muted lg:text-[17px] lg:leading-[26px]">
        {body}
      </p>
      <ul className="flex flex-col gap-2.5 lg:gap-3">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-center gap-2.5 text-sm text-stage-link lg:gap-3 lg:text-[15px]"
          >
            <Icon name="check" className="size-4 text-signal lg:size-[18px]" />
            {point}
          </li>
        ))}
      </ul>
      <a
        href={CONTACT_URL}
        className="group flex items-center gap-2 self-start pt-2 font-mono text-sm font-medium text-white lg:gap-2.5 lg:pt-3 lg:text-[15px]"
      >
        {link}
        <Icon
          name="arrowForward"
          className="size-4 transition-transform group-hover:translate-x-1 lg:size-[18px]"
        />
      </a>
    </article>
  );
}

export function AlsoFor() {
  const t = strings.alsoFor;
  return (
    <Section tone="stage">
      <div className="flex flex-col gap-8 lg:gap-16">
        <div className="flex flex-col gap-4 lg:gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <H2 className="max-w-[900px]">{t.title}</H2>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <Card id={ANCHORS.agencias} icon="campaign" {...t.agencias} />
          <Card id={ANCHORS.redesPrivadas} icon="accountBalance" {...t.redes} />
        </div>
      </div>
    </Section>
  );
}

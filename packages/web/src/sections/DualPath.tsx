/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import vallerosImage from "../assets/web-panel-valleros.webp";
import anunciantesImage from "../assets/web-panel-anunciantes.webp";
import { ButtonLink, Eyebrow, H2, Section } from "../components/ui.js";
import { ANCHORS, APP_URL } from "../links.js";
import { strings } from "../strings.js";

interface PanelProps {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  steps: readonly { title: string; body: string }[];
  cta: string;
  ctaHref: string;
  ctaVariant: "primary" | "outline";
}

function Panel({ id, image, eyebrow, title, steps, cta, ctaHref, ctaVariant }: PanelProps) {
  return (
    <article
      id={id}
      className="flex flex-1 scroll-mt-20 flex-col overflow-hidden rounded-[20px] border border-stage-line bg-stage-2"
    >
      <img
        src={image}
        alt=""
        width={1408}
        height={768}
        loading="lazy"
        className="h-[200px] w-full object-cover lg:h-[300px]"
      />
      <div className="flex flex-1 flex-col gap-5 p-7 lg:gap-7 lg:p-11">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="font-mono text-[23px] leading-[27px] font-semibold tracking-[-0.5px] text-white lg:text-[32px] lg:leading-[37px]">
          {title}
        </h3>
        <ol className="flex flex-1 flex-col gap-4 py-1 lg:gap-5 lg:py-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 border-t border-stage-line pt-5">
              <span className="font-mono text-[13px] font-medium tracking-[1.5px] text-signal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-lg leading-6 font-medium text-white">
                {step.title}
              </span>
              <span className="text-[15px] leading-[23px] text-stage-muted">{step.body}</span>
            </li>
          ))}
        </ol>
        <ButtonLink href={ctaHref} variant={ctaVariant} className="lg:self-start">
          {cta}
        </ButtonLink>
      </div>
    </article>
  );
}

export function DualPath() {
  const t = strings.dualPath;
  return (
    <Section id={ANCHORS.comoFunciona} tone="stage">
      <div className="flex flex-col gap-8 lg:gap-16">
        <div className="flex flex-col gap-4 lg:gap-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <H2 className="max-w-[900px]">{t.title}</H2>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <Panel
            id={ANCHORS.valleros}
            image={vallerosImage}
            {...t.valleros}
            ctaHref={APP_URL}
            ctaVariant="primary"
          />
          <Panel
            id={ANCHORS.anunciantes}
            image={anunciantesImage}
            {...t.anunciantes}
            ctaHref={APP_URL}
            ctaVariant="outline"
          />
        </div>
      </div>
    </Section>
  );
}

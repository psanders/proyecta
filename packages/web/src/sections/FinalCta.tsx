/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import finalImage from "../assets/web-final-cta.webp";
import { ButtonLink, Eyebrow } from "../components/ui.js";
import { APP_URL } from "../links.js";
import { strings } from "../strings.js";

export function FinalCta() {
  const t = strings.finalCta;
  return (
    <section className="relative overflow-hidden bg-stage">
      <img
        src={finalImage}
        alt=""
        width={1376}
        height={768}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-stage/72 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,#0B0B0BCC_0%,#0B0B0BF5_100%)] lg:bg-transparent"
      />
      <div className="relative flex flex-col items-center gap-7 px-5 py-16 lg:h-[560px] lg:justify-center lg:gap-9">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2 className="text-center font-mono text-[32px] leading-[37px] font-semibold tracking-[-1px] text-white lg:text-[56px] lg:leading-[62px] lg:tracking-[-1.5px]">
          {t.titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href={APP_URL} size="lg">
            {t.ctaScreens}
          </ButtonLink>
          <ButtonLink href={APP_URL} variant="outline" size="lg">
            {t.ctaAdvertise}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import heroImage from "../assets/web-hero.webp";
import { ButtonLink, Eyebrow } from "../components/ui.js";
import { ANCHORS, APP_URL, href } from "../links.js";
import { strings } from "../strings.js";

function NowPlayingCard() {
  const t = strings.hero.nowPlaying;
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-4 rounded-2xl border border-white/12 bg-stage/70 p-5 backdrop-blur-md lg:w-[340px] lg:shrink-0 lg:gap-[18px] lg:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-signal" />
          <span className="font-mono text-[11px] font-semibold tracking-[2px] text-signal">
            {t.live}
          </span>
        </span>
        <span className="font-mono text-[11px] text-stage-muted">{t.time}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xl font-semibold text-white">{t.ad}</span>
        <span className="text-sm text-stage-muted">{t.place}</span>
      </div>
      <div className="h-[3px] rounded-sm bg-white/15">
        <div className="h-full w-3/5 rounded-sm bg-signal" />
      </div>
      <div className="flex justify-between font-mono text-xs text-stage-soft">
        <span>{t.slot}</span>
        <span>{t.duration}</span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-stage lg:-mt-20 lg:h-[920px] lg:pt-20">
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 size-full object-cover"
        fetchPriority="high"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-stage/72 bg-[linear-gradient(180deg,#0B0B0B00_40%,#0B0B0B_100%),linear-gradient(90deg,#0B0B0BFA_0%,#0B0B0BD9_45%,#0B0B0B66_100%)] lg:bg-transparent lg:bg-[linear-gradient(180deg,#0B0B0B00_50%,#0B0B0B_100%),linear-gradient(90deg,#0B0B0BF2_0%,#0B0B0BB3_45%,#0B0B0B00_100%)]"
      />
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-5 px-5 pt-10 pb-8 md:px-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pt-0 lg:pb-[104px] xl:px-[120px]">
        <div className="flex max-w-[780px] flex-col gap-5 lg:gap-7">
          <Eyebrow>{strings.hero.eyebrow}</Eyebrow>
          <h1 className="font-mono text-[34px] leading-[37px] font-semibold tracking-[-1px] text-white lg:text-[56px] lg:leading-[60px] xl:text-[72px] xl:leading-[76px] xl:tracking-[-2px]">
            {strings.hero.title}
          </h1>
          <p className="max-w-[600px] text-base leading-6 text-stage-soft lg:text-[19px] lg:leading-[29px]">
            {strings.hero.sub}
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row lg:pt-3">
            <ButtonLink href={APP_URL} size="lg">
              {strings.hero.ctaScreens}
            </ButtonLink>
            <ButtonLink href={href(ANCHORS.anunciantes)} variant="outline" size="lg">
              {strings.hero.ctaAdvertise}
            </ButtonLink>
          </div>
        </div>
        <NowPlayingCard />
      </div>
    </section>
  );
}

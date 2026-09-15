/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import heroImage from "../assets/web-hero.webp";
import { ButtonLink, Eyebrow } from "../components/ui.js";
import { ANCHORS, APP_URL, href } from "../links.js";
import { strings } from "../strings.js";

const SLOT_SECONDS = 10;
/** Seconds shown when motion is reduced (the static design reads 0:06). */
const STATIC_SECOND = 6;

/** Fades its children up into place, `step` beats after the page loads. */
function Rise({
  step,
  className,
  children
}: {
  step: number;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = { animationDelay: `${150 + step * 110}ms` };
  return (
    <div className={`motion-safe:animate-rise ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}

/** The card plays a 10-second slot: the bar fills and the clock follows the bar's animation. */
function NowPlayingCard() {
  const t = strings.hero.nowPlaying;
  const barRef = useRef<HTMLDivElement>(null);
  const [second, setSecond] = useState(STATIC_SECOND);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const id = window.setInterval(() => {
      const time = bar.getAnimations()[0]?.currentTime;
      if (typeof time === "number") setSecond(Math.floor((time % (SLOT_SECONDS * 1000)) / 1000));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-4 rounded-2xl border border-white/12 bg-stage/70 p-5 backdrop-blur-md lg:w-[340px] lg:shrink-0 lg:gap-[18px] lg:p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-signal motion-safe:animate-pulse" />
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
      <div className="h-[3px] overflow-hidden rounded-sm bg-white/15">
        <div
          ref={barRef}
          className="h-full w-3/5 origin-left rounded-sm bg-signal motion-safe:w-full motion-safe:animate-progress"
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-stage-soft">
        <span>{t.slot}</span>
        <span className="tabular-nums">{`0:${String(second).padStart(2, "0")} / 0:${SLOT_SECONDS}`}</span>
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
        width={1408}
        height={768}
        className="absolute inset-0 size-full object-cover motion-safe:animate-hero-zoom"
        fetchPriority="high"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-stage/72 bg-[linear-gradient(180deg,#0B0B0B00_40%,#0B0B0B_100%),linear-gradient(90deg,#0B0B0BFA_0%,#0B0B0BD9_45%,#0B0B0B66_100%)] lg:bg-transparent lg:bg-[linear-gradient(180deg,#0B0B0B00_50%,#0B0B0B_100%),linear-gradient(90deg,#0B0B0BF2_0%,#0B0B0BB3_45%,#0B0B0B00_100%)]"
      />
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-5 px-5 pt-10 pb-8 md:px-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pt-0 lg:pb-[104px] xl:px-[120px]">
        <div className="flex max-w-[780px] flex-col gap-5 lg:gap-7">
          <Rise step={0}>
            <Eyebrow>{strings.hero.eyebrow}</Eyebrow>
          </Rise>
          <Rise step={1}>
            <h1 className="font-mono text-[34px] leading-[37px] font-semibold tracking-[-1px] text-white lg:text-[56px] lg:leading-[60px] xl:text-[72px] xl:leading-[76px] xl:tracking-[-2px]">
              {strings.hero.title}
            </h1>
          </Rise>
          <Rise step={2}>
            <p className="max-w-[600px] text-base leading-6 text-stage-soft lg:text-[19px] lg:leading-[29px]">
              {strings.hero.sub}
            </p>
          </Rise>
          <Rise step={3} className="flex flex-col gap-3 pt-2 sm:flex-row lg:pt-3">
            <ButtonLink href={APP_URL} size="lg">
              {strings.hero.ctaScreens}
            </ButtonLink>
            <ButtonLink href={href(ANCHORS.anunciantes)} variant="outline" size="lg">
              {strings.hero.ctaAdvertise}
            </ButtonLink>
          </Rise>
        </div>
        <Rise step={5} className="w-full lg:w-auto lg:shrink-0">
          <NowPlayingCard />
        </Rise>
      </div>
    </section>
  );
}

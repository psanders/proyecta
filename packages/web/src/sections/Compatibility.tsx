/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import pairingShot from "../assets/app-player-pairing.webp";
import { Icon } from "../components/Icon.js";
import { Eyebrow, H2, Section } from "../components/ui.js";
import { strings } from "../strings.js";

export function Compatibility() {
  const t = strings.compatibility;
  return (
    <Section tone="paper">
      <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-20">
        <figure className="flex w-full flex-col gap-4 lg:w-[660px] lg:shrink lg:gap-5">
          <div className="rounded-[14px] border border-[#333333] bg-stage-3 p-2.5 shadow-[0_40px_80px_-20px_#00000099]">
            <img
              src={pairingShot}
              alt={t.shotAlt}
              width={1600}
              height={900}
              loading="lazy"
              className="block aspect-video w-full rounded-md object-cover"
            />
          </div>
          <figcaption className="flex items-center gap-2.5 text-[13px] text-ink-muted lg:text-sm">
            <Icon name="link" className="size-4 lg:size-[18px]" />
            {t.caption}
          </figcaption>
        </figure>
        <div className="flex w-full flex-1 flex-col gap-6 lg:gap-7">
          <Eyebrow tone="paper">{t.eyebrow}</Eyebrow>
          <H2 tone="paper">{t.title}</H2>
          <ul className="flex flex-col">
            {t.devices.map((device) => (
              <li
                key={device.label}
                className="flex items-center gap-3.5 border-b border-paper-line py-3.5 lg:gap-4"
              >
                <Icon name={device.icon} className="size-5 text-ink lg:size-[22px]" />
                <span className="font-mono text-[15px] font-medium text-ink lg:text-base">
                  {device.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 rounded-2xl bg-stage p-6 lg:flex-row lg:gap-5 lg:p-7">
            <Icon name="wifiOff" className="size-[26px] text-signal lg:size-7" />
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="font-mono text-[17px] font-medium text-white lg:text-lg">
                {t.offlineTitle}
              </p>
              <p className="text-sm leading-[21px] text-stage-muted lg:text-[15px] lg:leading-[23px]">
                {t.offlineBody}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
            <span className="font-mono text-[11px] tracking-[2px] text-ink-muted">
              {t.formatsLabel}
            </span>
            <ul className="flex flex-wrap gap-2">
              {t.formats.map((format) => (
                <li
                  key={format}
                  className="rounded-full border border-paper-line px-3 py-[5px] font-mono text-xs text-ink"
                >
                  {format}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

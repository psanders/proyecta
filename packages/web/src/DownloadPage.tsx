/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * proyecta.do/download, from the Pencil frames web-download and web-download-mobile. The version,
 * dates, file names and sizes come from the downloads store's latest.json when the page loads, so
 * a release updates the page without redeploying it; if the store can't be read, the version is
 * hidden and every button goes to the latest GitHub release.
 */
import { useEffect, useState } from "react";
import clsx from "clsx";
import pairingShot from "./assets/app-player-pairing.webp";
import { Icon, type IconName } from "./components/Icon.js";
import { ButtonLink, Eyebrow, H2, Section } from "./components/ui.js";
import {
  fetchLatestRelease,
  findInstaller,
  formatReleaseDate,
  formatSize,
  type InstallerFile,
  type LatestRelease,
  type Platform
} from "./lib/latestRelease.js";
import { APP_URL, CONTACT_URL, DOWNLOADS_URL, RELEASES_URL, SIGN_UP_URL } from "./links.js";
import { Footer } from "./sections/Footer.js";
import { Nav } from "./sections/Nav.js";
import { strings } from "./strings.js";

const t = strings.download;

/** Loading: undefined; store unreachable: null. */
function useLatestRelease(): LatestRelease | null | undefined {
  const [release, setRelease] = useState<LatestRelease | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void fetchLatestRelease(DOWNLOADS_URL).then((result) => live && setRelease(result));
    return () => {
      live = false;
    };
  }, []);
  return release;
}

function DownloadButton({
  file,
  label,
  secondary
}: {
  file: InstallerFile | undefined;
  label: string;
  secondary?: boolean;
}) {
  return (
    <a
      href={file?.url ?? RELEASES_URL}
      download={file ? file.name : undefined}
      data-testid="download-button"
      className={clsx(
        "inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full px-6 font-mono text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal lg:h-[52px] lg:text-[15px]",
        secondary
          ? "border border-paper-line bg-white text-ink hover:bg-paper"
          : "bg-signal text-ink hover:bg-[#f07448]"
      )}
    >
      <Icon name="download" className="size-[18px]" />
      {label}
    </a>
  );
}

function PlatformCard({
  platform,
  icon,
  release,
  popular
}: {
  platform: Platform;
  icon: IconName;
  release: LatestRelease | null | undefined;
  popular?: boolean;
}) {
  const copy = t.platforms[platform];
  const main = findInstaller(release ?? null, platform, platform === "linux" ? "amd64" : undefined);
  const arm = platform === "linux" ? findInstaller(release ?? null, "linux", "arm64") : undefined;
  return (
    <article
      data-testid={`platform-${platform}`}
      className="flex flex-col gap-[18px] rounded-2xl border border-paper-line bg-white p-[22px] lg:gap-6 lg:p-8"
    >
      <div className="flex items-center gap-3.5 lg:justify-between">
        <span className="flex size-11 items-center justify-center rounded-[10px] bg-stage lg:size-[52px] lg:rounded-xl">
          <Icon name={icon} className="size-[22px] text-signal lg:size-[26px]" />
        </span>
        <h3 className="font-mono text-[19px] font-semibold text-ink lg:hidden">{copy.name}</h3>
        {popular && (
          <span className="ml-auto rounded-full border border-paper-line px-2.5 py-1 font-mono text-[10px] font-medium tracking-[1.2px] text-ink-muted lg:ml-0 lg:px-3 lg:text-[11px] lg:tracking-[1.5px]">
            {t.popular}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="hidden font-mono text-2xl font-semibold text-ink lg:block">{copy.name}</h3>
        <p className="text-[15px] leading-[1.5] text-ink-muted lg:text-base">{copy.body}</p>
      </div>
      <ul className="flex flex-col gap-2 lg:gap-2.5">
        {copy.requirements.map((line) => (
          <li
            key={line}
            className="flex items-center gap-2 text-sm text-ink lg:gap-2.5 lg:text-[15px]"
          >
            <Icon name="check" className="size-4 text-signal lg:size-[18px]" />
            {line}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 lg:mt-auto lg:gap-2.5">
        <DownloadButton file={main} label={copy.button} />
        {"buttonArm" in copy && <DownloadButton file={arm} label={copy.buttonArm} secondary />}
        <p
          className="text-center font-mono text-[11px] text-ink-muted lg:text-xs"
          data-testid="file-info"
        >
          {main
            ? `${main.name} · ${formatSize(main.size)}`
            : release === null
              ? t.fallbackFile
              : " "}
        </p>
      </div>
    </article>
  );
}

export function DownloadPage() {
  const release = useLatestRelease();
  return (
    <>
      <Nav />
      <main>
        <section className="bg-stage px-5 pt-10 pb-12 md:px-10 lg:py-16 lg:pb-[88px] xl:px-[120px]">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="flex flex-col gap-5 lg:w-[620px] lg:shrink-0 lg:gap-7">
              <Eyebrow>{release ? t.eyebrowVersion(release.version) : t.eyebrow}</Eyebrow>
              <h1 className="font-mono text-[34px] leading-[1.1] font-semibold tracking-[-1px] text-white lg:text-[72px] lg:leading-[1.05] lg:tracking-[-2px]">
                {t.heading}
              </h1>
              <p className="text-[15px] leading-[1.55] text-stage-soft lg:text-[19px]">{t.sub}</p>
              {release && (
                <p
                  data-testid="version-chip"
                  className="flex w-fit items-center gap-2 rounded-full border border-stage-line px-3.5 py-1.5 font-mono text-xs font-medium text-white lg:text-[13px]"
                >
                  <span aria-hidden className="size-2 rounded-full bg-signal" />
                  {t.versionChip(release.version, formatReleaseDate(release.publishedAt))}
                </p>
              )}
            </div>
            <div className="w-full rounded-[14px] border border-[#333333] bg-stage-3 p-1.5 shadow-[0_40px_80px_-20px_#00000099] lg:p-2.5">
              <img
                src={pairingShot}
                alt={t.shotAlt}
                width={1600}
                height={900}
                className="block aspect-video w-full rounded-md object-cover"
              />
            </div>
          </div>
        </section>

        <Section tone="paper" className="lg:!pt-24 lg:!pb-[72px]">
          <div className="flex flex-col gap-6 lg:gap-12">
            <div className="flex flex-col gap-4">
              <Eyebrow tone="paper">{t.platformsEyebrow}</Eyebrow>
              <H2 tone="paper">{t.platformsTitle}</H2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <PlatformCard platform="android" icon="tv" release={release} popular />
              <PlatformCard platform="linux" icon="terminal" release={release} />
              <PlatformCard platform="windows" icon="desktopWindows" release={release} />
            </div>
          </div>
        </Section>

        <section className="bg-stage px-5 py-14 md:px-10 lg:py-[120px] xl:px-[120px]">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="flex flex-col gap-5 lg:w-[640px] lg:gap-6">
              <Eyebrow>{t.nextEyebrow}</Eyebrow>
              <H2>{t.nextTitle}</H2>
              <p className="text-[15px] leading-[1.55] text-stage-muted lg:text-[17px]">
                {t.nextBody}
              </p>
              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:gap-3 lg:pt-2">
                <ButtonLink href={APP_URL} size="lg">
                  {t.openPanel}
                </ButtonLink>
                <ButtonLink href={SIGN_UP_URL} variant="outline" size="lg">
                  {t.signUp}
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-stage-line bg-stage-2 p-[22px] lg:w-[420px] lg:shrink-0 lg:gap-5 lg:p-7">
              <p className="font-mono text-base font-medium text-white lg:text-lg">{t.helpTitle}</p>
              <p className="text-sm leading-[1.5] text-stage-muted lg:text-[15px]">{t.helpBody}</p>
              <ButtonLink href={CONTACT_URL} variant="outline" className="w-full">
                {t.helpCta}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

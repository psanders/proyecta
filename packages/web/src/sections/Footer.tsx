/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { Logo } from "../components/ui.js";
import { ANCHORS, APP_URL, CONTACT_URL, href } from "../links.js";
import { strings } from "../strings.js";
import { NAV_LINKS } from "./Nav.js";

function Column({
  heading,
  links
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 lg:gap-3.5">
      <p className="font-mono text-xs tracking-[2px] text-subtle">{heading}</p>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="text-[15px] text-stage-link transition-colors hover:text-white"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function Footer() {
  const t = strings.footer;
  return (
    <footer className="border-t border-stage-line bg-stage px-5 pt-14 pb-8 md:px-10 lg:pt-20 lg:pb-12 xl:px-[120px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 lg:gap-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-3.5 lg:w-[360px] lg:gap-4">
            <Logo />
            <p className="text-sm leading-[21px] text-stage-muted lg:text-[15px] lg:leading-[23px]">
              {t.tagline}
            </p>
          </div>
          <div className="flex flex-col gap-7 sm:flex-row sm:gap-24">
            <Column heading={t.platformHeading} links={NAV_LINKS.slice(0, 4)} />
            <Column
              heading={t.proyectaHeading}
              links={[
                { label: strings.nav.comoFunciona, href: href(ANCHORS.comoFunciona) },
                { label: t.contact, href: CONTACT_URL },
                { label: strings.nav.login, href: APP_URL }
              ]}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-stage-line pt-6 text-[13px] text-subtle lg:flex-row lg:justify-between">
          <p className="leading-[18px]">{t.copyright}</p>
          <p className="font-mono">{t.domain}</p>
        </div>
      </div>
    </footer>
  );
}

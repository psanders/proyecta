/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.js";
import { ButtonLink, Logo } from "../components/ui.js";
import { ANCHORS, APP_URL, HOME_URL, href } from "../links.js";
import { strings } from "../strings.js";

export const NAV_LINKS = [
  { label: strings.nav.pantallas, href: href(ANCHORS.valleros) },
  { label: strings.nav.anunciantes, href: href(ANCHORS.anunciantes) },
  { label: strings.nav.agencias, href: href(ANCHORS.agencias) },
  { label: strings.nav.redesPrivadas, href: href(ANCHORS.redesPrivadas) },
  { label: strings.nav.comoFunciona, href: href(ANCHORS.comoFunciona) }
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-stage-line bg-stage/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:h-20 xl:px-[120px]">
        <a href={HOME_URL} aria-label={strings.brand}>
          <Logo />
        </a>
        <ul className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[15px] text-stage-link transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href={APP_URL} variant="ghost">
            {strings.nav.login}
          </ButtonLink>
          <ButtonLink href={APP_URL}>{strings.nav.cta}</ButtonLink>
        </div>
        <button
          type="button"
          className="-mr-2.5 flex size-11 items-center justify-center text-white lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? strings.nav.closeMenu : strings.nav.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? "close" : "menu"} className="size-6" />
        </button>
      </nav>
      {open && (
        <div
          id="mobile-menu"
          className="border-t border-stage-line bg-stage px-5 pt-2 pb-6 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center border-b border-stage-line text-[15px] text-stage-link"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink href={APP_URL}>{strings.nav.cta}</ButtonLink>
            <ButtonLink href={APP_URL} variant="outline">
              {strings.nav.login}
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { formatPairingCode } from "@proyecta/common";
import { el, icon } from "./dom.js";
import { icons } from "./icons.js";
import { strings } from "./strings.js";

/** Pairing screen from Pencil frame player-pairing. Returns a function that removes it. */
export function showPairing(stage: HTMLElement, code: string): () => void {
  const logo = el("div", "logo");
  logo.append(icon(icons.tv), el("span", "", strings.brand));
  const head = el("div", "head");
  head.append(el("h1", "", strings.pairingTitle), el("p", "", strings.pairingBody));
  const waiting = el("div", "waiting");
  waiting.append(el("span", "dot"), el("span", "", strings.waiting));

  const screen = el("section", "pairing");
  screen.append(
    logo,
    el("div", "domain", strings.domain),
    head,
    el("div", "code-box", formatPairingCode(code)),
    waiting
  );
  stage.append(screen);
  return () => screen.remove();
}

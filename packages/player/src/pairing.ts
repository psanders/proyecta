/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { formatPairingCode } from "@proyecta/common";
import { el, icon } from "./dom.js";
import { icons } from "./icons.js";
import { strings } from "./strings.js";

export interface PairingScreen {
  /** Shows the screen with the device's code (or a placeholder while it's unknown). */
  show(code: string | null): void;
  setWaiting(text: string): void;
  hide(): void;
}

/** Pairing screen from Pencil frame player-pairing. */
export function createPairingScreen(stage: HTMLElement): PairingScreen {
  const logo = el("div", "logo");
  logo.append(icon(icons.tv), el("span", "", strings.brand));
  const head = el("div", "head");
  head.append(el("h1", "", strings.pairingTitle), el("p", "", strings.pairingBody));
  const codeBox = el("div", "code-box", "····-····");
  const waitingText = el("span", "", strings.waiting);
  const waiting = el("div", "waiting");
  waiting.append(el("span", "dot"), waitingText);

  const screen = el("section", "pairing");
  screen.append(logo, el("div", "domain", strings.domain), head, codeBox, waiting);

  return {
    show(code) {
      codeBox.textContent = code ? formatPairingCode(code) : "····-····";
      if (!screen.isConnected) stage.append(screen);
    },
    setWaiting(text) {
      waitingText.textContent = text;
    },
    hide() {
      screen.remove();
    }
  };
}

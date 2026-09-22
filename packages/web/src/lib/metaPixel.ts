/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Meta pixel for the marketing site. The dataset is "Proyecta Website" under the
 * Fonoster business portfolio; the id is injected at build time from the
 * VITE_META_PIXEL_ID secret and left unset locally, so dev and previews never
 * reach the dataset.
 */
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Injects fbevents.js and fires the one PageView this single-page site needs. */
export function initMetaPixel() {
  if (!PIXEL_ID || window.fbq) return;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
}

/**
 * The site's only conversions are outbound: heading to the app to sign up, or
 * opening the contact address. `label` says which, and nothing else is sent.
 */
export function trackLead(label: "app-cta" | "contact") {
  window.fbq?.("track", "Lead", { content_name: label });
}

/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/** The owner dashboard. Overridable per environment so previews can point at a local stack. */
export const APP_URL = import.meta.env.VITE_APP_URL ?? "https://app.proyecta.do";

/** Account creation in the dashboard. */
export const SIGN_UP_URL = `${APP_URL}/sign-up`;

/** The home page, from any page of the site. */
export const HOME_URL = import.meta.env.BASE_URL;

/** The downloads store: versioned installers plus latest.json (see the player-shells spec). */
export const DOWNLOADS_URL =
  import.meta.env.VITE_DOWNLOADS_URL ?? "https://api.proyecta.do/downloads";

/** Where download buttons go when the store can't be read. */
export const RELEASES_URL = "https://github.com/psanders/proyecta/releases/latest";

/** Where "Contacto", "Habla con ventas" and "Solicita una demo" go. Placeholder until the real inbox exists. */
export const CONTACT_URL = import.meta.env.VITE_CONTACT_URL ?? "mailto:hola@proyecta.do";

export const ANCHORS = {
  valleros: "valleros",
  anunciantes: "anunciantes",
  comoFunciona: "como-funciona",
  agencias: "agencias",
  redesPrivadas: "redes-privadas",
  red: "la-red",
  faq: "preguntas"
} as const;

/** A home-page section, reachable from any page (on the home page it only scrolls). */
export const href = (anchor: (typeof ANCHORS)[keyof typeof ANCHORS]) => `${HOME_URL}#${anchor}`;

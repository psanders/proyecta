/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */

/** The owner dashboard. Overridable per environment so previews can point at a local stack. */
export const APP_URL = import.meta.env.VITE_APP_URL ?? "https://app.proyecta.do";

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

export const href = (anchor: (typeof ANCHORS)[keyof typeof ANCHORS]) => `#${anchor}`;

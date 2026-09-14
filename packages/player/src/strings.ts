/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
// All user-facing player text (Spanish, DR). No i18n library: v0 is Spanish-only.
export const strings = {
  brand: "PROYECTA",
  domain: "proyecta.do",
  pairingTitle: "Vincula esta pantalla",
  pairingBody: "Ingresa este código en tu panel de Proyecta para activar esta pantalla en la red.",
  waiting: "Esperando conexión...",
  nowPlaying: "REPRODUCIENDO",
  connected: "Conectada",
  offline: "Sin conexión",
  next: (advertiser: string, seconds: number) => `Siguiente: ${advertiser} · ${seconds}s`,
  playlist: (name: string, position: number, total: number) =>
    `${name} · anuncio ${position} de ${total}`
} as const;

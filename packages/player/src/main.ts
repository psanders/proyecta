/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { formatPairingCode } from "@proyecta/common";
import "./theme.css";

// Placeholder until the player-core change. Codes are minted by the API (never on the device);
// this sample code only shows the branded pairing layout.
const stage = document.getElementById("stage");
if (stage) {
  stage.innerHTML = `
    <div style="text-align:center">
      <p style="font-family:var(--font-mono);font-size:calc(28 * var(--px));margin:0">PROYECTA</p>
      <p style="font-family:var(--font-mono);font-size:calc(56 * var(--px));color:var(--signal);margin:calc(24 * var(--px)) 0">
        ${formatPairingCode("8F3K2QLM")}
      </p>
      <p style="color:var(--muted-2);font-size:calc(14 * var(--px));margin:0">Esperando conexión...</p>
    </div>`;
}

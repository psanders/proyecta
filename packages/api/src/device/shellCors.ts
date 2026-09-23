/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { RequestHandler } from "express";

/**
 * Origin the Android shell serves the bundled player from (WebViewAssetLoader). It is the only
 * cross-origin caller of the device protocol and media; every other player is same-origin.
 */
export const ANDROID_SHELL_ORIGIN = "https://appassets.androidplatform.net";

/** Lets the Android shell's player call /device/v1 and fetch /media and /content. */
export function shellCors(): RequestHandler {
  return (req, res, next) => {
    if (req.headers.origin !== ANDROID_SHELL_ORIGIN) return next();
    res.setHeader("Access-Control-Allow-Origin", ANDROID_SHELL_ORIGIN);
    res.setHeader("Vary", "Origin");
    if (req.method !== "OPTIONS") return next();
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, range");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  };
}

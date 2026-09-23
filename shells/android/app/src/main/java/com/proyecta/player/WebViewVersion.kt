/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

/**
 * Oldest WebView (Chromium major) the player supports. Must match MIN_CHROMIUM in
 * packages/player/vite.config.ts; a working value until the device spike measures real boxes.
 */
const val MIN_WEBVIEW_MAJOR = 69

/** Chromium major from a WebView package versionName such as "118.0.5993.80". */
fun webViewMajor(versionName: String?): Int? =
    versionName?.substringBefore('.')?.toIntOrNull()

/** Chromium major from a WebView user agent ("... Chrome/58.0.3029.83 Mobile Safari/537.36"). */
fun webViewMajorFromUserAgent(userAgent: String?): Int? =
    userAgent?.let { Regex("""Chrome/(\d+)\.""").find(it)?.groupValues?.get(1)?.toIntOrNull() }

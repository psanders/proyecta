/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import android.content.res.AssetManager
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.IOException

/** The origin the bundled player is served from; the API allows CORS for exactly this origin. */
const val PLAYER_ORIGIN = "https://appassets.androidplatform.net"

private val MIME_TYPES = mapOf(
    "html" to "text/html",
    "js" to "text/javascript",
    "css" to "text/css",
    "svg" to "image/svg+xml",
    "woff" to "font/woff",
    "woff2" to "font/woff2",
    "webp" to "image/webp",
    "png" to "image/png",
    "json" to "application/json"
)

fun mimeTypeFor(path: String): String =
    MIME_TYPES[path.substringAfterLast('.', "").lowercase()] ?: "application/octet-stream"

/**
 * Serves the player's dist/ (copied into assets/player/ at build time) at the root of
 * [PLAYER_ORIGIN], so Vite's absolute /assets/... URLs resolve without a network. Unknown paths
 * return null and fall through to the network (e.g. /shell/info, which only kiosks answer).
 */
class PlayerAssets(private val assets: AssetManager) : WebViewAssetLoader.PathHandler {
    override fun handle(path: String): WebResourceResponse? {
        val file = path.ifEmpty { "index.html" }
        return try {
            WebResourceResponse(mimeTypeFor(file), "utf-8", assets.open("player/$file"))
        } catch (_: IOException) {
            null
        }
    }
}

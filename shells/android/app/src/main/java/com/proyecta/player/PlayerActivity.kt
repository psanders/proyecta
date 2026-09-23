/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.graphics.createBitmap
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat

private const val RECOVER_DELAY_MS = 1_000L

/**
 * The whole app: one full-screen WebView running the bundled player, kept awake, with system
 * bars hidden. Shows unsupported.html instead when the WebView is older than the player supports,
 * and rebuilds the WebView if its renderer process dies.
 */
class PlayerActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemBars()
        show()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    @Deprecated("A screen has no way back out of the player.")
    @Suppress("MissingSuperCall")
    override fun onBackPressed() = Unit

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        webView?.destroy()
        webView = null
        super.onDestroy()
    }

    private fun show() {
        val packageVersion = runCatching { WebViewCompat.getCurrentWebViewPackage(this)?.versionName }.getOrNull()
        val view = try {
            WebView(this)
        } catch (_: RuntimeException) {
            // No usable WebView package at all: nothing web can render, so say it natively.
            setContentView(noWebViewNotice())
            return
        }
        val major = webViewMajor(packageVersion) ?: webViewMajorFromUserAgent(view.settings.userAgentString)
        configure(view, packageVersion)
        setContentView(view)
        webView = view
        view.loadUrl(
            if (major != null && major < MIN_WEBVIEW_MAJOR) {
                "$PLAYER_ORIGIN/unsupported.html?installed=$major&required=$MIN_WEBVIEW_MAJOR"
            } else {
                "$PLAYER_ORIGIN/index.html"
            }
        )
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun configure(view: WebView, packageVersion: String?) {
        val debuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
        WebView.setWebContentsDebuggingEnabled(debuggable)
        view.setBackgroundColor(ContextCompat.getColor(this@PlayerActivity, R.color.stage))
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            // Debug builds may talk to a plain-HTTP dev API (10.0.2.2) from the https asset origin.
            if (debuggable) mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
        view.addJavascriptInterface(ShellBridge(applicationContext, packageVersion), "ProyectaShell")

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", PlayerAssets(assets))
            .build()
        view.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                recover(view)
                return true
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            // Without this, Android WebView draws a grey play button over every video before it starts.
            override fun getDefaultVideoPoster(): Bitmap = createBitmap(1, 1)
        }
    }

    /** The renderer died (crash or OOM kill): drop this WebView and start the player again. */
    private fun recover(dead: WebView) {
        (dead.parent as? ViewGroup)?.removeView(dead)
        dead.destroy()
        if (webView === dead) webView = null
        handler.postDelayed({ if (!isFinishing) show() }, RECOVER_DELAY_MS)
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun noWebViewNotice() = TextView(this).apply {
        text = getString(R.string.no_webview)
        setTextColor(ContextCompat.getColor(this@PlayerActivity, R.color.muted))
        setBackgroundColor(ContextCompat.getColor(this@PlayerActivity, R.color.stage))
        textSize = 20f
        gravity = Gravity.CENTER
        setPadding(96, 96, 96, 96)
    }
}

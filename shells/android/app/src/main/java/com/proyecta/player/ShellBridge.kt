/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.StatFs
import android.os.SystemClock
import android.provider.Settings
import android.system.Os
import android.system.OsConstants
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.io.File

private const val MB = 1024L * 1024L

/**
 * `window.ProyectaShell`: what the player reads about this device. Methods return strings (the
 * bridge only passes primitives); info() and metrics() are JSON matching shellInfoSchema and
 * shellMetricsSchema in packages/common. Every figure has the exact meaning the device-sync spec
 * gives it: RAM and disk are the device's, CPU load is this app's process.
 */
class ShellBridge(private val context: Context, private val webViewVersion: String?) {
    private var lastCpu: CpuSample? = null

    /** ANDROID_ID: survives reinstalls with the same signing key, which keeps the pairing code. */
    @SuppressLint("HardwareIds")
    @JavascriptInterface
    fun hardwareId(): String =
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: ""

    @JavascriptInterface
    fun shell(): String = "ANDROID"

    @JavascriptInterface
    fun version(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun info(): String = JSONObject().apply {
        put("deviceModel", deviceModel().take(80))
        put("osVersion", "Android ${Build.VERSION.RELEASE}".take(40))
        put("cpuCores", Runtime.getRuntime().availableProcessors())
        webViewVersion?.let { put("webviewVersion", it.take(32)) }
    }.toString()

    @JavascriptInterface
    @Synchronized
    fun metrics(): String = JSONObject().apply {
        val memory = ActivityManager.MemoryInfo()
        (context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(memory)
        put("memoryTotalMb", memory.totalMem / MB)
        put("memoryUsedMb", (memory.totalMem - memory.availMem) / MB)

        val disk = StatFs(context.filesDir.path)
        val total = disk.blockCountLong * disk.blockSizeLong
        put("diskTotalMb", total / MB)
        put("diskUsedMb", (total - disk.availableBlocksLong * disk.blockSizeLong) / MB)

        cpuPercent()?.let {
            put("cpuPercent", Math.round(it * 10) / 10.0)
            put("cpuScope", "process")
        }
    }.toString()

    private fun cpuPercent(): Double? {
        val ticks = runCatching { parseProcStatTicks(File("/proc/self/stat").readText()) }.getOrNull()
            ?: return null
        val current = CpuSample(ticks, SystemClock.elapsedRealtime())
        val previous = lastCpu
        lastCpu = current
        if (previous == null) return null
        val ticksPerSecond = Os.sysconf(OsConstants._SC_CLK_TCK)
        return processCpuPercent(previous, current, ticksPerSecond, Runtime.getRuntime().availableProcessors())
    }

    private fun deviceModel(): String {
        val manufacturer = Build.MANUFACTURER.orEmpty()
        val model = Build.MODEL.orEmpty()
        return if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model".trim()
    }
}

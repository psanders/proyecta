/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

/** CPU time this process had used (clock ticks) at a moment (ms). */
data class CpuSample(val ticks: Long, val atMs: Long)

/**
 * utime + stime (fields 14 and 15) from a /proc/self/stat line. The command name (field 2) is in
 * parentheses and may contain spaces, so fields are counted after its closing parenthesis.
 */
fun parseProcStatTicks(line: String): Long? {
    val fields = line.substringAfterLast(')').trim().split(' ')
    // After ")" the first field is state (field 3), so utime is index 11 and stime index 12.
    val utime = fields.getOrNull(11)?.toLongOrNull() ?: return null
    val stime = fields.getOrNull(12)?.toLongOrNull() ?: return null
    return utime + stime
}

/**
 * The app process's CPU load between two samples, 0–100 across all cores. Android 8+ blocks
 * /proc/stat for apps, so the shell can only report its own process (cpuScope "process").
 */
fun processCpuPercent(previous: CpuSample, current: CpuSample, ticksPerSecond: Long, cores: Int): Double? {
    val elapsedMs = current.atMs - previous.atMs
    if (elapsedMs <= 0 || ticksPerSecond <= 0 || cores <= 0) return null
    val cpuMs = (current.ticks - previous.ticks) * 1000.0 / ticksPerSecond
    return (cpuMs / (elapsedMs * cores) * 100).coerceIn(0.0, 100.0)
}

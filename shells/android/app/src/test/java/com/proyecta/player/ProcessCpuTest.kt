/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProcessCpuTest {
    private val stat = "4321 (com.proyecta player) S 1 4321 0 0 -1 1077952832 12000 0 3 0 " +
        "150 50 0 0 20 0 42 0 9000 1900000000 30000 18446744073709551615"

    @Test
    fun sumsUserAndSystemTicksEvenWithSpacesInTheName() {
        assertEquals(200L, parseProcStatTicks(stat))
    }

    @Test
    fun rejectsATruncatedLine() {
        assertNull(parseProcStatTicks("4321 (player) S 1 2"))
    }

    @Test
    fun spreadsTheLoadAcrossAllCores() {
        // 100 ticks at 100 Hz = 1 s of CPU over 1 s of wall time on 4 cores = 25 %.
        val percent = processCpuPercent(CpuSample(200, 0), CpuSample(300, 1000), 100, 4)
        assertEquals(25.0, percent!!, 0.001)
    }

    @Test
    fun hasNoReadingWithoutElapsedTime() {
        assertNull(processCpuPercent(CpuSample(200, 1000), CpuSample(300, 1000), 100, 4))
    }
}

/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WebViewVersionTest {
    @Test
    fun readsTheMajorFromThePackageVersion() {
        assertEquals(118, webViewMajor("118.0.5993.80"))
    }

    @Test
    fun readsTheMajorFromTheUserAgent() {
        val ua = "Mozilla/5.0 (Linux; Android 7.1.2; X96mini Build/NHG47L; wv) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Safari/537.36"
        assertEquals(58, webViewMajorFromUserAgent(ua))
    }

    @Test
    fun rejectsUnreadableVersions() {
        assertNull(webViewMajor(null))
        assertNull(webViewMajor("dev-build"))
        assertNull(webViewMajorFromUserAgent("Mozilla/5.0 (Linux; Android 5.0)"))
    }
}

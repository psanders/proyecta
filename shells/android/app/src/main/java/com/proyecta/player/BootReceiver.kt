/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
package com.proyecta.player

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Opens the player when the device boots. On Android 10+ a background app may not start an
 * activity, so there the device must have Proyecta set as its home app (which also covers boot).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != "android.intent.action.QUICKBOOT_POWERON") {
            return
        }
        context.startActivity(
            Intent(context, PlayerActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
}

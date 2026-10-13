package com.aiphone.assistant.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra(Notifications.EXTRA_TITLE) ?: "Northstar"
        val body = intent.getStringExtra(Notifications.EXTRA_BODY).orEmpty()
        val id = intent.getIntExtra(Notifications.EXTRA_ID, 1)
        Notifications.show(context, id, title, body)
    }
}

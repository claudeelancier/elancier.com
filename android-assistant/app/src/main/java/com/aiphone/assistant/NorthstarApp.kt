package com.aiphone.assistant

import android.app.Application
import com.aiphone.assistant.reminder.Notifications

class NorthstarApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannel(this)
    }
}

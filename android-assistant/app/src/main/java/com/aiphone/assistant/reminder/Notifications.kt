package com.aiphone.assistant.reminder

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.aiphone.assistant.MainActivity
import com.aiphone.assistant.R

object Notifications {
    const val CHANNEL_ID = "northstar_reminders"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Reminders",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Timers and reminders from Northstar"
        }
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, id: Int, title: String, body: String) {
        ensureChannel(context)
        val open = PendingIntent.getActivity(
            context,
            id,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_star)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        context.getSystemService(NotificationManager::class.java).notify(id, notification)
    }

    fun schedule(context: Context, delaySeconds: Int, title: String, body: String): String {
        ensureChannel(context)
        val id = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        if (delaySeconds <= 0) {
            show(context, id, title, body)
            return "Reminder posted."
        }
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(EXTRA_TITLE, title)
            putExtra(EXTRA_BODY, body)
            putExtra(EXTRA_ID, id)
        }
        val pending = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val triggerAt = System.currentTimeMillis() + delaySeconds * 1000L
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        try {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending)
        } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pending)
        }
        return "Reminder set."
    }

    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_ID = "id"
}

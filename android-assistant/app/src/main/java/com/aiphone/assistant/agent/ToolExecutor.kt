package com.aiphone.assistant.agent

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.provider.AlarmClock
import android.provider.CalendarContract
import android.provider.Settings
import com.aiphone.assistant.reminder.Notifications
import java.net.URLEncoder
import java.text.DateFormat
import java.util.Date

class ToolExecutor(private val context: Context) {
    fun execute(action: AgentAction): ExecutedAction {
        val summary = try {
            when (action) {
                is AgentAction.Flashlight -> flashlight(action.on)
                is AgentAction.OpenUrl -> openUrl(action.url)
                is AgentAction.WebSearch -> openUrl(
                    "https://www.google.com/search?q=" + URLEncoder.encode(action.query, Charsets.UTF_8.name()),
                )
                is AgentAction.Dial -> start(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${action.number}")), "Opened the dialer.")
                is AgentAction.Sms -> start(smsIntent(action), "Opened a text draft.")
                is AgentAction.Alarm -> alarm(action)
                is AgentAction.Timer -> timer(action)
                is AgentAction.OpenSettings -> start(Intent(settingsAction(action.panel)), "Opened settings.")
                AgentAction.DeviceStatus -> deviceStatus()
                AgentAction.Clock -> DateFormat.getTimeInstance(DateFormat.SHORT).format(Date()).let { "It's $it." }
                is AgentAction.ShareText -> share(action.text)
                is AgentAction.OpenApp -> openApp(action.name)
                is AgentAction.CalendarEvent -> calendar(action)
                is AgentAction.Notify -> Notifications.schedule(context, action.delaySeconds, action.title, action.body)
                is AgentAction.Volume -> volume(action.direction)
            }
        } catch (_: ActivityNotFoundException) {
            "Nothing on this phone can handle that."
        } catch (_: SecurityException) {
            "That needs a permission the phone didn't grant."
        } catch (_: Exception) {
            "That didn't work on this phone."
        }
        return ExecutedAction(action.label, summary)
    }

    fun requiredPermission(action: AgentAction): String? = when (action) {
        is AgentAction.Flashlight -> android.Manifest.permission.CAMERA
        is AgentAction.Notify -> if (android.os.Build.VERSION.SDK_INT >= 33) {
            android.Manifest.permission.POST_NOTIFICATIONS
        } else {
            null
        }
        else -> null
    }

    private fun flashlight(on: Boolean): String {
        val cameras = context.getSystemService(CameraManager::class.java)
        val id = cameras.cameraIdList.firstOrNull { cameraId ->
            cameras.getCameraCharacteristics(cameraId)
                .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return "This phone doesn't have a flashlight I can use."
        cameras.setTorchMode(id, on)
        return if (on) "Flashlight on." else "Flashlight off."
    }

    private fun openUrl(url: String): String {
        val uri = Uri.parse(url)
        val scheme = uri.scheme?.lowercase()
        if (scheme != "http" && scheme != "https") return "Only http and https links can be opened."
        return start(Intent(Intent.ACTION_VIEW, uri), "Opened the link.")
    }

    private fun smsIntent(action: AgentAction.Sms): Intent {
        return Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${action.number}")).apply {
            putExtra("sms_body", action.body)
        }
    }

    private fun alarm(action: AgentAction.Alarm): String {
        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(AlarmClock.EXTRA_HOUR, action.hour)
            putExtra(AlarmClock.EXTRA_MINUTES, action.minute)
            putExtra(AlarmClock.EXTRA_MESSAGE, action.message)
            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
        }
        return start(intent, "Opened the clock so you can save the alarm.")
    }

    private fun timer(action: AgentAction.Timer): String {
        val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
            putExtra(AlarmClock.EXTRA_LENGTH, action.seconds)
            putExtra(AlarmClock.EXTRA_MESSAGE, action.message)
            putExtra(AlarmClock.EXTRA_SKIP_UI, false)
        }
        return start(intent, "Opened a ${action.seconds}-second timer.")
    }

    private fun settingsAction(panel: String): String = when (panel) {
        "wifi" -> Settings.ACTION_WIFI_SETTINGS
        "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
        "display" -> Settings.ACTION_DISPLAY_SETTINGS
        "sound" -> Settings.ACTION_SOUND_SETTINGS
        "apps" -> Settings.ACTION_APPLICATION_SETTINGS
        "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
        "battery" -> Settings.ACTION_BATTERY_SAVER_SETTINGS
        else -> Settings.ACTION_SETTINGS
    }

    private fun deviceStatus(): String {
        val battery = context.getSystemService(BatteryManager::class.java)
        val level = battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val charging = if (battery.isCharging) "charging" else "not charging"
        val time = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())
        return "It's $time. Battery $level%, $charging."
    }

    private fun share(text: String): String {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        val chooser = Intent.createChooser(send, "Share").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
        return "Opened the share sheet."
    }

    private fun calendar(action: AgentAction.CalendarEvent): String {
        val start = System.currentTimeMillis() + action.minutesFromNow * 60_000L
        val intent = Intent(Intent.ACTION_INSERT).apply {
            data = CalendarContract.Events.CONTENT_URI
            putExtra(CalendarContract.Events.TITLE, action.title)
            putExtra(CalendarContract.Events.DESCRIPTION, action.description)
            putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
            putExtra(CalendarContract.EXTRA_EVENT_END_TIME, start + 30 * 60_000L)
        }
        return start(intent, "Opened the calendar. Save the event if it looks right.")
    }

    private fun volume(direction: AgentAction.Volume.Direction): String {
        val audio = context.getSystemService(AudioManager::class.java)
        val adjust = when (direction) {
            AgentAction.Volume.Direction.UP -> AudioManager.ADJUST_RAISE
            AgentAction.Volume.Direction.DOWN -> AudioManager.ADJUST_LOWER
            AgentAction.Volume.Direction.MUTE -> AudioManager.ADJUST_MUTE
            AgentAction.Volume.Direction.UNMUTE -> AudioManager.ADJUST_UNMUTE
        }
        audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, adjust, AudioManager.FLAG_SHOW_UI)
        return when (direction) {
            AgentAction.Volume.Direction.UP -> "Volume up."
            AgentAction.Volume.Direction.DOWN -> "Volume down."
            AgentAction.Volume.Direction.MUTE -> "Media muted."
            AgentAction.Volume.Direction.UNMUTE -> "Media unmuted."
        }
    }

    private fun openApp(name: String): String {
        val key = name.lowercase()
        knownPackages[key].orEmpty().forEach { packageName ->
            val launch = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launch)
                return "Opened $name."
            }
        }
        val main = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = context.packageManager.queryIntentActivities(main, PackageManager.MATCH_DEFAULT_ONLY)
        val exact = apps.firstOrNull {
            it.loadLabel(context.packageManager).toString().equals(name, ignoreCase = true)
        }
        val fuzzy = apps.firstOrNull {
            it.loadLabel(context.packageManager).toString().contains(name, ignoreCase = true)
        }
        val match = exact ?: fuzzy
        if (match == null) return "I couldn't find an app named $name."
        val launch = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).apply {
            setClassName(match.activityInfo.packageName, match.activityInfo.name)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(launch)
        return "Opened ${match.loadLabel(context.packageManager)}."
    }

    private fun start(intent: Intent, success: String): String {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return success
    }

    private companion object {
        val knownPackages = mapOf(
            "phone" to listOf("com.google.android.dialer", "com.android.dialer"),
            "messages" to listOf("com.google.android.apps.messaging", "com.android.mms"),
            "sms" to listOf("com.google.android.apps.messaging"),
            "camera" to listOf("com.google.android.GoogleCamera", "com.android.camera2", "com.android.camera"),
            "chrome" to listOf("com.android.chrome", "com.chrome.beta"),
            "youtube" to listOf("com.google.android.youtube"),
            "maps" to listOf("com.google.android.apps.maps"),
            "gmail" to listOf("com.google.android.gm"),
            "photos" to listOf("com.google.android.apps.photos"),
            "calendar" to listOf("com.google.android.calendar"),
            "clock" to listOf("com.google.android.deskclock", "com.android.deskclock"),
            "calculator" to listOf("com.google.android.calculator"),
            "settings" to listOf("com.android.settings"),
            "files" to listOf("com.google.android.documentsui", "com.google.android.apps.nbu.files"),
        )
    }
}

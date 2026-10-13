package com.aiphone.assistant.agent

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

object AgentResponseParser {
    fun parseLoose(raw: String): AgentTurn {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return AgentTurn("")
        val jsonText = extractJson(trimmed)
        if (jsonText != null) {
            try {
                val obj = JSONObject(jsonText)
                if (obj.has("say") || obj.has("actions")) {
                    return fromEnvelope(obj)
                }
            } catch (_: JSONException) {
                // The model spoke prose that happened to contain braces.
            }
        }
        return AgentTurn(stripFence(trimmed))
    }

    fun parseTool(name: String, arguments: String): AgentAction? {
        val args = try {
            when {
                arguments.isBlank() -> JSONObject()
                arguments.trim().startsWith("{") -> JSONObject(arguments)
                else -> JSONObject()
            }
        } catch (_: JSONException) {
            JSONObject()
        }
        return actionFrom(name, args)
    }

    private fun fromEnvelope(obj: JSONObject): AgentTurn {
        val say = obj.optString("say")
        val actionsJson = obj.optJSONArray("actions") ?: JSONArray()
        val actions = buildList {
            for (i in 0 until actionsJson.length()) {
                val item = actionsJson.optJSONObject(i) ?: continue
                val action = actionFrom(item.optString("name"), item.optJSONObject("args") ?: JSONObject())
                if (action != null) add(action)
            }
        }
        return AgentTurn(say, actions)
    }

    private fun actionFrom(rawName: String, args: JSONObject): AgentAction? {
        val name = rawName.trim().lowercase().removePrefix("functions.")
        return when (name) {
            "flashlight" -> AgentAction.Flashlight(args.bool("on"))
            "open_url" -> args.string("url")?.let { AgentAction.OpenUrl(it.take(2000)) }
            "web_search" -> args.string("query")?.let { AgentAction.WebSearch(it.take(300)) }
            "dial" -> args.string("number")?.let(PhoneNumbers::normalize)?.let(AgentAction::Dial)
            "sms" -> {
                val number = args.string("number")?.let(PhoneNumbers::normalize) ?: return null
                val body = args.string("body") ?: return null
                AgentAction.Sms(number, body.take(1000))
            }
            "alarm" -> {
                val hour = args.int("hour") ?: return null
                val minute = args.int("minute") ?: 0
                if (hour !in 0..23 || minute !in 0..59) return null
                AgentAction.Alarm(hour, minute, args.string("message")?.take(80) ?: "Alarm")
            }
            "timer" -> {
                val seconds = args.int("seconds") ?: return null
                if (seconds !in 1..86_400) return null
                AgentAction.Timer(seconds, args.string("label")?.take(80) ?: "Timer")
            }
            "open_settings" -> {
                val panel = args.string("panel")?.lowercase() ?: "general"
                val known = setOf("wifi", "bluetooth", "display", "sound", "apps", "location", "battery", "general")
                AgentAction.OpenSettings(if (panel in known) panel else "general")
            }
            "device_status" -> AgentAction.DeviceStatus
            "clock" -> AgentAction.Clock
            "share" -> args.string("text")?.let { AgentAction.ShareText(it.take(1000)) }
            "open_app" -> args.string("name")?.take(60)?.takeIf { it.isNotBlank() }?.let(AgentAction::OpenApp)
            "calendar" -> {
                val title = args.string("title")?.take(120) ?: return null
                val minutes = args.int("minutes_from_now") ?: 60
                if (minutes !in 0..(60 * 24 * 30)) return null
                AgentAction.CalendarEvent(title, minutes, args.string("description")?.take(500) ?: "")
            }
            "notify" -> {
                val title = args.string("title")?.take(80) ?: "Northstar"
                val body = args.string("body")?.take(180) ?: return null
                val delay = args.int("delay_seconds") ?: 0
                if (delay !in 0..86_400) return null
                AgentAction.Notify(title, body, delay)
            }
            "volume" -> when (args.string("direction")?.lowercase()) {
                "up" -> AgentAction.Volume(AgentAction.Volume.Direction.UP)
                "down" -> AgentAction.Volume(AgentAction.Volume.Direction.DOWN)
                "mute" -> AgentAction.Volume(AgentAction.Volume.Direction.MUTE)
                "unmute" -> AgentAction.Volume(AgentAction.Volume.Direction.UNMUTE)
                else -> null
            }
            else -> null
        }
    }

    private fun extractJson(text: String): String? {
        val stripped = stripFence(text).trim()
        val start = stripped.indexOf('{')
        val end = stripped.lastIndexOf('}')
        if (start < 0 || end <= start) return null
        return stripped.substring(start, end + 1)
    }

    private fun stripFence(text: String): String {
        val trimmed = text.trim()
        if (!trimmed.startsWith("```")) return trimmed
        return trimmed
            .removePrefix("```json")
            .removePrefix("```JSON")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()
    }

    private fun JSONObject.string(key: String): String? {
        if (!has(key) || isNull(key)) return null
        val value = optString(key).trim()
        return value.ifBlank { null }
    }

    private fun JSONObject.bool(key: String, default: Boolean = false): Boolean {
        if (!has(key) || isNull(key)) return default
        return when (val value = get(key)) {
            is Boolean -> value
            is String -> value.equals("true", ignoreCase = true) || value == "1"
            is Number -> value.toInt() != 0
            else -> default
        }
    }

    private fun JSONObject.int(key: String): Int? {
        if (!has(key) || isNull(key)) return null
        return when (val value = get(key)) {
            is Number -> value.toInt()
            is String -> value.trim().toIntOrNull()
            else -> null
        }
    }
}

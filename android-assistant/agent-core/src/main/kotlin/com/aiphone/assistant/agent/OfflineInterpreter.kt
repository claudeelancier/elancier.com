package com.aiphone.assistant.agent

/**
 * Handles phone commands without a network. Returns null when the phrase is
 * open-ended and should go to the cloud model.
 */
object OfflineInterpreter {
    private val help = Regex("""(?:please\s+)?(?:help|what can you do|commands)""")
    private val flashlightOff = Regex(
        """(?:please\s+)?(?:turn\s+(?:the\s+)?(?:flash\s?light|torch)\s+off|""" +
            """(?:flash\s?light|torch)\s+off|turn\s+off\s+(?:the\s+)?(?:flash\s?light|torch))""",
    )
    private val flashlightOn = Regex(
        """(?:please\s+)?(?:turn\s+(?:the\s+)?(?:flash\s?light|torch)\s+on|""" +
            """(?:flash\s?light|torch)\s+on|turn\s+on\s+(?:the\s+)?(?:flash\s?light|torch)|""" +
            """(?:flash\s?light|torch))""",
    )
    private val battery = Regex(
        """(?:please\s+)?(?:what(?:'s| is) my battery|battery(?:\s+(?:level|status))?|how much battery)""",
    )
    private val clock = Regex(
        """(?:please\s+)?(?:what(?:'s| is) the time|what time is it|current time|time)""",
    )
    private val volumeUp = Regex(
        """(?:please\s+)?(?:volume\s+up|louder|turn\s+(?:it|the\s+volume)\s+up|raise\s+(?:the\s+)?volume)""",
    )
    private val volumeDown = Regex(
        """(?:please\s+)?(?:volume\s+down|quieter|turn\s+(?:it|the\s+volume)\s+down|lower\s+(?:the\s+)?volume)""",
    )
    private val mute = Regex("""(?:please\s+)?(?:mute|mute\s+(?:the\s+)?(?:volume|sound))""")
    private val unmute = Regex("""(?:please\s+)?unmute(?:\s+(?:the\s+)?(?:volume|sound))?""")
    private val timer = Regex(
        """(?:please\s+)?(?:set\s+)?(?:a\s+)?timer(?:\s+for)?\s+(\d+)\s+""" +
            """(second|seconds|sec|minute|minutes|min|hour|hours)""" +
            """(?:\s+(?:called|named)\s+(.+))?""",
    )
    private val remind = Regex(
        """(?:please\s+)?remind me(?:\s+to)?\s+(.+?)\s+in\s+(\d+)\s+""" +
            """(second|seconds|sec|minute|minutes|min|hour|hours)""",
    )
    private val alarm = Regex(
        """(?:please\s+)?(?:set\s+(?:an?\s+)?)?(?:alarm|wake me(?:\s+up)?)""" +
            """(?:\s+(?:for|at))?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?""" +
            """(?:\s+(?:called|named)\s+(.+))?""",
    )
    private val smsAttempt = Regex("""(?:please\s+)?(?:text|sms|message)\s+(.+)""")
    private val dialAttempt = Regex("""(?:please\s+)?(?:call|dial|phone)\s+(.+)""")
    private val settings = Regex(
        """(?:please\s+)?(?:open|show|launch)\s+""" +
            """(wifi|wi-fi|bluetooth|display|brightness|sound|apps|app settings|location|battery settings|settings)""" +
            """(?:\s+settings)?""",
    )
    private val urlCommand = Regex("""(?:please\s+)?(?:open|go\s+to|visit)\s+(https?://\S+)""")
    private val bareUrl = Regex("""https?://\S+""")
    private val search = Regex("""(?:please\s+)?(?:search(?:\s+for)?|google|look\s+up)\s+(.+)""")
    private val share = Regex("""(?:please\s+)?share\s+(.+)""")
    private val calendar = Regex(
        """(?:please\s+)?(?:add|create|schedule)\s+(?:a\s+)?(?:calendar\s+)?""" +
            """(?:event|meeting|appointment)\s+(?:called\s+|named\s+|for\s+)?""" +
            """(.+?)(?:\s+in\s+(\d+)\s+(minute|minutes|min|hour|hours))?""",
    )
    private val openApp = Regex("""(?:please\s+)?open\s+(.+)""")

    fun interpret(raw: String): AgentTurn? {
        val text = raw.trim().replace(Regex("\\s+"), " ").trimEnd('.', '!', '?').trim()
        if (text.isEmpty()) return null
        val lower = text.lowercase()

        if (help.matchEntire(lower) != null) return helpTurn()
        flashlight(lower)?.let { return it }
        status(lower)?.let { return it }
        volume(lower)?.let { return it }
        timer(lower)?.let { return it }
        remind(lower)?.let { return it }
        alarm(lower)?.let { return it }
        sms(text, lower)?.let { return it }
        dial(text, lower)?.let { return it }
        settings(lower)?.let { return it }
        url(text, lower)?.let { return it }
        search(text, lower)?.let { return it }
        share(text, lower)?.let { return it }
        calendar(text, lower)?.let { return it }
        openApp(text, lower)?.let { return it }
        return null
    }

    private fun helpTurn() = AgentTurn(
        "I can use the flashlight, read the time and battery, change volume, set timers, alarms, and reminders, " +
            "open apps and settings, search the web, share text, and draft a call or text when you give me a number. " +
            "Add an API key in Settings for open-ended chat.",
    )

    private fun flashlight(lower: String): AgentTurn? {
        if (flashlightOff.matchEntire(lower) != null) {
            return AgentTurn("Turning the flashlight off.", listOf(AgentAction.Flashlight(false)))
        }
        if (flashlightOn.matchEntire(lower) != null) {
            return AgentTurn("Turning the flashlight on.", listOf(AgentAction.Flashlight(true)))
        }
        return null
    }

    private fun status(lower: String): AgentTurn? = when {
        battery.matchEntire(lower) != null -> AgentTurn("Checking the phone.", listOf(AgentAction.DeviceStatus))
        clock.matchEntire(lower) != null -> AgentTurn("", listOf(AgentAction.Clock))
        else -> null
    }

    private fun volume(lower: String): AgentTurn? {
        val direction = when {
            volumeUp.matchEntire(lower) != null -> AgentAction.Volume.Direction.UP
            volumeDown.matchEntire(lower) != null -> AgentAction.Volume.Direction.DOWN
            mute.matchEntire(lower) != null -> AgentAction.Volume.Direction.MUTE
            unmute.matchEntire(lower) != null -> AgentAction.Volume.Direction.UNMUTE
            else -> null
        } ?: return null
        val say = when (direction) {
            AgentAction.Volume.Direction.UP -> "Raising the volume."
            AgentAction.Volume.Direction.DOWN -> "Lowering the volume."
            AgentAction.Volume.Direction.MUTE -> "Muting media."
            AgentAction.Volume.Direction.UNMUTE -> "Unmuting media."
        }
        return AgentTurn(say, listOf(AgentAction.Volume(direction)))
    }

    private fun timer(lower: String): AgentTurn? {
        val match = timer.matchEntire(lower) ?: return null
        val seconds = unitSeconds(match.groupValues[1].toIntOrNull() ?: return null, match.groupValues[2])
            ?: return AgentTurn("Use a timer under 24 hours.")
        val message = match.groupValues[3].ifBlank { "Timer" }.take(80)
        return AgentTurn(
            "Setting a timer for ${humanDuration(seconds)}.",
            listOf(AgentAction.Timer(seconds, message)),
        )
    }

    private fun remind(lower: String): AgentTurn? {
        val match = remind.matchEntire(lower) ?: return null
        val body = match.groupValues[1].trim().take(140)
        if (body.isBlank()) return null
        val seconds = unitSeconds(match.groupValues[2].toIntOrNull() ?: return null, match.groupValues[3])
            ?: return AgentTurn("Use a reminder under 24 hours.")
        return AgentTurn(
            "I'll remind you in ${humanDuration(seconds)}.",
            listOf(AgentAction.Notify("Northstar", body, seconds)),
        )
    }

    private fun alarm(lower: String): AgentTurn? {
        val match = alarm.matchEntire(lower) ?: return null
        val hour = match.groupValues[1].toIntOrNull() ?: return null
        val minute = match.groupValues[2].toIntOrNull() ?: 0
        val clock = to24(hour, minute, match.groupValues[3]) ?: return AgentTurn("That clock time doesn't look right.")
        val message = match.groupValues[4].ifBlank { "Alarm" }.take(80)
        return AgentTurn(
            "Setting an alarm for ${clockLabel(clock.first, clock.second)}.",
            listOf(AgentAction.Alarm(clock.first, clock.second, message)),
        )
    }

    private fun sms(original: String, lower: String): AgentTurn? {
        val match = smsAttempt.matchEntire(lower) ?: return null
        val rest = slice(original, match.groups[1]).trim()
        val split = PhoneNumbers.splitNumberAndBody(rest)
            ?: return AgentTurn("Tell me a phone number and the message. I don't read your contacts. Try: text 5550100 I'm on my way.")
        return AgentTurn(
            "Opening a text to ${split.first}. You can still edit it before sending.",
            listOf(AgentAction.Sms(split.first, split.second)),
        )
    }

    private fun dial(original: String, lower: String): AgentTurn? {
        val match = dialAttempt.matchEntire(lower) ?: return null
        val rest = slice(original, match.groups[1]).trim()
        val number = PhoneNumbers.normalize(rest)
            ?: return AgentTurn("Give me a phone number to call. I don't read your contacts. Try: call 5550100.")
        return AgentTurn(
            "Opening the phone for $number. Nothing is dialed until you press call.",
            listOf(AgentAction.Dial(number)),
        )
    }

    private fun settings(lower: String): AgentTurn? {
        val match = settings.matchEntire(lower) ?: return null
        val panel = when (match.groupValues[1]) {
            "wifi", "wi-fi" -> "wifi"
            "bluetooth" -> "bluetooth"
            "display", "brightness" -> "display"
            "sound" -> "sound"
            "apps", "app settings" -> "apps"
            "location" -> "location"
            "battery settings" -> "battery"
            else -> "general"
        }
        return AgentTurn("Opening ${panel.replace('_', ' ')} settings.", listOf(AgentAction.OpenSettings(panel)))
    }

    private fun url(original: String, lower: String): AgentTurn? {
        val fromCommand = urlCommand.matchEntire(lower)
        val url = when {
            fromCommand != null -> slice(original, fromCommand.groups[1]).trim()
            bareUrl.matchEntire(lower) != null -> original.trim()
            else -> return null
        }
        return AgentTurn("Opening that link.", listOf(AgentAction.OpenUrl(url.take(2000))))
    }

    private fun search(original: String, lower: String): AgentTurn? {
        val match = search.matchEntire(lower) ?: return null
        val query = slice(original, match.groups[1]).trim().take(300)
        if (query.isBlank()) return null
        return AgentTurn("Searching for $query.", listOf(AgentAction.WebSearch(query)))
    }

    private fun share(original: String, lower: String): AgentTurn? {
        val match = share.matchEntire(lower) ?: return null
        val text = slice(original, match.groups[1]).trim().take(1000)
        if (text.isBlank()) return null
        return AgentTurn("Opening the share sheet.", listOf(AgentAction.ShareText(text)))
    }

    private fun calendar(source: String, lower: String): AgentTurn? {
        val match = calendar.matchEntire(lower) ?: return null
        var title = slice(source, match.groups[1]).trim()
        val minutes = if (match.groupValues[2].isNotBlank()) {
            val count = match.groupValues[2].toIntOrNull() ?: return null
            val seconds = unitSeconds(count, match.groupValues[3]) ?: return AgentTurn("Schedule it within 24 hours.")
            seconds / 60
        } else {
            60
        }
        title = title.take(120)
        if (title.isBlank()) return null
        return AgentTurn(
            "Opening your calendar for \"$title\". You confirm the event before it is saved.",
            listOf(AgentAction.CalendarEvent(title, minutes, "")),
        )
    }

    private fun openApp(original: String, lower: String): AgentTurn? {
        val match = openApp.matchEntire(lower) ?: return null
        val name = slice(original, match.groups[1]).trim().take(60)
        if (name.isBlank() || name.any { it == '\n' }) return null
        return AgentTurn("Opening $name.", listOf(AgentAction.OpenApp(name)))
    }

    private fun slice(source: String, group: MatchGroup?): String {
        val range = group?.range ?: return ""
        if (range.first < 0 || range.last >= source.length) return group.value
        return source.substring(range)
    }

    private fun unitSeconds(count: Int, unit: String): Int? {
        if (count <= 0) return null
        val multiplier = when (unit.lowercase()) {
            "second", "seconds", "sec" -> 1
            "minute", "minutes", "min" -> 60
            "hour", "hours" -> 3600
            else -> return null
        }
        val total = count.toLong() * multiplier
        if (total > 86_400L) return null
        return total.toInt()
    }

    private fun to24(hour: Int, minute: Int, ampm: String): Pair<Int, Int>? {
        if (minute !in 0..59) return null
        if (ampm.isBlank()) {
            if (hour !in 0..23) return null
            return hour to minute
        }
        if (hour !in 1..12) return null
        val base = hour % 12
        val adjusted = if (ampm == "pm") base + 12 else base
        return adjusted to minute
    }

    internal fun humanDuration(seconds: Int): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return listOfNotNull(
            if (hours > 0) "$hours ${plural(hours, "hour")}" else null,
            if (minutes > 0) "$minutes ${plural(minutes, "minute")}" else null,
            if (secs > 0) "$secs ${plural(secs, "second")}" else null,
        ).joinToString(" ").ifBlank { "0 seconds" }
    }

    internal fun clockLabel(hour: Int, minute: Int): String {
        val suffix = if (hour < 12) "AM" else "PM"
        val shown = when (val h = hour % 12) {
            0 -> 12
            else -> h
        }
        return "%d:%02d %s".format(shown, minute, suffix)
    }

    private fun plural(count: Int, word: String) = if (count == 1) word else "${word}s"
}

package com.aiphone.assistant.agent

data class AssistantSettings(
    val provider: String = ProviderPresets.OPENAI,
    val baseUrl: String = "https://api.openai.com/v1",
    val model: String = "gpt-4o-mini",
    val apiKey: String = "",
    val voiceReplies: Boolean = true,
)

object ProviderPresets {
    const val OPENAI = "openai"
    const val GROQ = "groq"
    const val OPENROUTER = "openrouter"
    const val CUSTOM = "custom"

    data class Preset(val id: String, val label: String, val baseUrl: String, val model: String)

    val all: List<Preset> = listOf(
        Preset(OPENAI, "OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
        Preset(GROQ, "Groq", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
        Preset(OPENROUTER, "OpenRouter", "https://openrouter.ai/api/v1", "openai/gpt-4o-mini"),
        Preset(CUSTOM, "Custom", "", ""),
    )
}

data class ChatMessage(
    val id: String,
    val role: Role,
    val text: String,
    val actions: List<String> = emptyList(),
    val timestamp: Long = 0L,
) {
    enum class Role { USER, ASSISTANT }
}

data class AgentTurn(
    val say: String,
    val actions: List<AgentAction> = emptyList(),
)

sealed interface AgentAction {
    val label: String

    data class Flashlight(val on: Boolean) : AgentAction {
        override val label: String get() = if (on) "Flashlight on" else "Flashlight off"
    }

    data class OpenUrl(val url: String) : AgentAction {
        override val label: String get() = "Open link"
    }

    data class WebSearch(val query: String) : AgentAction {
        override val label: String get() = "Search"
    }

    data class Dial(val number: String) : AgentAction {
        override val label: String get() = "Call $number"
    }

    data class Sms(val number: String, val body: String) : AgentAction {
        override val label: String get() = "Text $number"
    }

    data class Alarm(val hour: Int, val minute: Int, val message: String) : AgentAction {
        override val label: String get() = "Alarm %02d:%02d".format(hour, minute)
    }

    data class Timer(val seconds: Int, val message: String) : AgentAction {
        override val label: String get() = "Timer"
    }

    data class OpenSettings(val panel: String) : AgentAction {
        override val label: String get() = "Settings"
    }

    data object DeviceStatus : AgentAction {
        override val label: String get() = "Device status"
    }

    data object Clock : AgentAction {
        override val label: String get() = "Clock"
    }

    data class ShareText(val text: String) : AgentAction {
        override val label: String get() = "Share"
    }

    data class OpenApp(val name: String) : AgentAction {
        override val label: String get() = "Open $name"
    }

    data class CalendarEvent(
        val title: String,
        val minutesFromNow: Int,
        val description: String,
    ) : AgentAction {
        override val label: String get() = "Calendar"
    }

    data class Notify(val title: String, val body: String, val delaySeconds: Int) : AgentAction {
        override val label: String get() = "Reminder"
    }

    data class Volume(val direction: Direction) : AgentAction {
        override val label: String get() = "Volume"

        enum class Direction { UP, DOWN, MUTE, UNMUTE }
    }
}

data class ExecutedAction(val label: String, val summary: String)

object ReplyComposer {
    fun compose(say: String, summaries: List<String>): String {
        val spoken = say.trim()
        val extras = summaries.map { it.trim() }.filter { line ->
            line.isNotBlank() && !line.equals(spoken, ignoreCase = true)
        }
        return buildList {
            if (spoken.isNotBlank()) add(spoken)
            addAll(extras)
        }.joinToString("\n")
    }
}

object EndpointPolicy {
    fun allow(raw: String): Boolean {
        val uri = try {
            java.net.URI(raw.trim())
        } catch (_: Exception) {
            return false
        }
        if (!uri.userInfo.isNullOrBlank()) return false
        val scheme = uri.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase() ?: return false
        if (host.isBlank()) return false
        return when (scheme) {
            "https" -> true
            "http" -> host == "localhost" || host == "127.0.0.1" || host == "10.0.2.2"
            else -> false
        }
    }
}

object PhoneNumbers {
    fun normalize(raw: String): String? {
        val cleaned = raw.filter { it.isDigit() || it == '+' }
        val digits = cleaned.count { it.isDigit() }
        if (digits !in 3..15) return null
        if (cleaned.count { it == '+' } > 1) return null
        if ('+' in cleaned && !cleaned.startsWith("+")) return null
        return cleaned
    }

    fun splitNumberAndBody(rest: String): Pair<String, String>? {
        val tokens = rest.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        if (tokens.isEmpty()) return null
        val numberTokens = mutableListOf<String>()
        var index = 0
        while (index < tokens.size) {
            val token = tokens[index]
            val phoneLike = token.any { it.isDigit() } && token.none { it.isLetter() }
            if (!phoneLike) break
            numberTokens += token
            index += 1
            val soFar = normalize(numberTokens.joinToString(""))
            val nextIsWord = index < tokens.size && tokens[index].any { it.isLetter() }
            if (soFar != null && nextIsWord) break
        }
        val number = normalize(numberTokens.joinToString("")) ?: return null
        val body = tokens.drop(index).joinToString(" ").trim()
        if (body.isEmpty()) return null
        return number to body.take(1000)
    }
}

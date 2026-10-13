package com.aiphone.assistant.agent

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class LlmException(message: String) : Exception(message)

sealed interface LlmStep {
    data class Reply(val say: String, val actions: List<AgentAction>) : LlmStep
    data class Calls(val assistantMessage: JSONObject, val calls: List<ToolCall>) : LlmStep
}

data class ToolCall(val id: String, val name: String, val arguments: String)

class LlmClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .callTimeout(70, TimeUnit.SECONDS)
        .build(),
) {
    fun conversation(history: List<ChatMessage>): JSONArray {
        val messages = JSONArray()
        messages.put(JSONObject().put("role", "system").put("content", SYSTEM_PROMPT))
        history.takeLast(16).forEach { message ->
            if (message.text.isBlank()) return@forEach
            messages.put(
                JSONObject()
                    .put("role", if (message.role == ChatMessage.Role.USER) "user" else "assistant")
                    .put("content", message.text.take(4000)),
            )
        }
        return messages
    }

    fun toolMessage(id: String, name: String, content: String): JSONObject {
        return JSONObject()
            .put("role", "tool")
            .put("tool_call_id", id)
            .put("name", name)
            .put("content", content.take(2000))
    }

    fun step(settings: AssistantSettings, messages: JSONArray, includeTools: Boolean): LlmStep {
        if (settings.apiKey.isBlank()) throw LlmException("Add an API key in Settings.")
        if (!EndpointPolicy.allow(settings.baseUrl)) {
            throw LlmException("Use an https endpoint. Local http is only allowed for localhost.")
        }
        val first = post(settings, messages, includeTools)
        val response = if (includeTools && first.code == 400 && toolRejected(first.body)) {
            post(settings, messages, includeTools = false)
        } else {
            first
        }
        if (response.code !in 200..299) {
            throw LlmException(errorMessage(response.code, response.body))
        }
        return parse(response.body)
    }

    private fun post(settings: AssistantSettings, messages: JSONArray, includeTools: Boolean): RawResponse {
        val payload = JSONObject()
            .put("model", settings.model)
            .put("temperature", 0.3)
            .put("messages", messages)
        if (includeTools) {
            payload.put("tools", toolSpecs())
            payload.put("tool_choice", "auto")
        }
        val url = settings.baseUrl.trim().trimEnd('/') + "/chat/completions"
        val requestBuilder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer ${settings.apiKey}")
            .header("Content-Type", "application/json")
        if (url.contains("openrouter.ai")) {
            requestBuilder.header("HTTP-Referer", "https://northstar.app")
            requestBuilder.header("X-Title", "Northstar")
        }
        val request = requestBuilder
            .post(payload.toString().toRequestBody(JSON))
            .build()
        try {
            http.newCall(request).execute().use { response ->
                return RawResponse(response.code, response.body?.string().orEmpty())
            }
        } catch (e: IOException) {
            throw LlmException("Couldn't reach the model. Check the connection and base URL.")
        }
    }

    private fun parse(body: String): LlmStep {
        val root = try {
            JSONObject(body)
        } catch (_: JSONException) {
            throw LlmException("The model returned something that wasn't JSON.")
        }
        val choice = root.optJSONArray("choices")?.optJSONObject(0)
            ?: throw LlmException("The model returned no choices.")
        val message = choice.optJSONObject("message")
            ?: throw LlmException("The model returned an empty message.")
        val toolCalls = message.optJSONArray("tool_calls")
        if (toolCalls != null && toolCalls.length() > 0) {
            val calls = buildList {
                for (i in 0 until toolCalls.length()) {
                    val call = toolCalls.optJSONObject(i) ?: continue
                    val function = call.optJSONObject("function") ?: continue
                    val name = function.optString("name")
                    if (name.isBlank()) continue
                    val arguments = when (val raw = function.opt("arguments")) {
                        is String -> raw
                        is JSONObject -> raw.toString()
                        else -> "{}"
                    }
                    add(ToolCall(call.optString("id").ifBlank { "call_$i" }, name, arguments))
                }
            }
            if (calls.isNotEmpty()) {
                val assistant = JSONObject()
                    .put("role", "assistant")
                    .put("content", if (message.isNull("content")) JSONObject.NULL else contentText(message))
                    .put("tool_calls", toolCalls)
                return LlmStep.Calls(assistant, calls)
            }
        }
        val content = contentText(message)
        val turn = AgentResponseParser.parseLoose(content)
        return LlmStep.Reply(turn.say, turn.actions)
    }

    private fun contentText(message: JSONObject): String {
        if (!message.has("content") || message.isNull("content")) return ""
        return when (val value = message.get("content")) {
            is String -> value
            is JSONArray -> buildString {
                for (i in 0 until value.length()) {
                    when (val part = value.opt(i)) {
                        is String -> append(part)
                        is JSONObject -> append(part.optString("text"))
                    }
                }
            }
            else -> value.toString()
        }
    }

    private fun toolRejected(body: String): Boolean {
        val lower = body.lowercase()
        return "tool" in lower || "function" in lower
    }

    private fun errorMessage(code: Int, body: String): String {
        val parsed = try {
            JSONObject(body).optJSONObject("error")?.optString("message").orEmpty()
        } catch (_: JSONException) {
            ""
        }
        val message = parsed.lineSequence().firstOrNull()?.take(180).orEmpty()
        return if (message.isBlank()) "The model request failed (HTTP $code)." else message
    }

    private data class RawResponse(val code: Int, val body: String)

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        internal val SYSTEM_PROMPT = """
            You are Northstar, an assistant on the user's own Android phone.
            Take actions only through tools. After a tool runs, confirm the tool result in one or two short sentences.
            You cannot read contacts, SMS, notifications, or other apps. Calls and texts open the system app so the user can confirm.
            Never ask for passwords, one-time codes, or payment details.
            If the API cannot call tools, reply with JSON only and no markdown:
            {"say":"short reply","actions":[{"name":"tool_name","args":{}}]}
            If no phone action is needed, reply with normal text.
        """.trimIndent()

        private fun toolSpecs(): JSONArray = JSONArray()
            .put(tool("flashlight", "Turn the camera flashlight on or off.", props("on" to boolProp("True to turn on")), required("on")))
            .put(tool("device_status", "Read the current time and battery.", props()))
            .put(tool("clock", "Read the local time.", props()))
            .put(tool("volume", "Change media volume.", props("direction" to enumProp(listOf("up", "down", "mute", "unmute"))), required("direction")))
            .put(tool("timer", "Start a countdown in the system clock app.", props("seconds" to intProp("1 to 86400"), "label" to strProp("Short label")), required("seconds")))
            .put(tool("notify", "Show a Northstar reminder notification.", props("title" to strProp("Title"), "body" to strProp("What to remember"), "delay_seconds" to intProp("0 to 86400")), required("body")))
            .put(tool("alarm", "Open the clock app to set an alarm.", props("hour" to intProp("0-23"), "minute" to intProp("0-59"), "message" to strProp("Label")), required("hour", "minute")))
            .put(tool("dial", "Open the dialer with a number. Does not place the call.", props("number" to strProp("Phone number")), required("number")))
            .put(tool("sms", "Open the SMS app with a number and draft. Does not send.", props("number" to strProp("Phone number"), "body" to strProp("Draft text")), required("number", "body")))
            .put(tool("open_url", "Open an http or https link.", props("url" to strProp("Absolute URL")), required("url")))
            .put(tool("web_search", "Open a web search.", props("query" to strProp("Search query")), required("query")))
            .put(tool("open_settings", "Open a system settings screen.", props("panel" to enumProp(listOf("wifi", "bluetooth", "display", "sound", "apps", "location", "battery", "general"))), required("panel")))
            .put(tool("open_app", "Open an installed app by its visible name.", props("name" to strProp("App name such as YouTube")), required("name")))
            .put(tool("calendar", "Open the calendar composer. The user saves the event.", props("title" to strProp("Event title"), "minutes_from_now" to intProp("Start offset in minutes"), "description" to strProp("Optional details")), required("title")))
            .put(tool("share", "Open the Android share sheet.", props("text" to strProp("Text to share")), required("text")))

        private fun tool(name: String, description: String, properties: JSONObject, required: JSONArray = JSONArray()): JSONObject {
            return JSONObject()
                .put("type", "function")
                .put(
                    "function",
                    JSONObject()
                        .put("name", name)
                        .put("description", description)
                        .put(
                            "parameters",
                            JSONObject()
                                .put("type", "object")
                                .put("properties", properties)
                                .put("required", required)
                                .put("additionalProperties", false),
                        ),
                )
        }

        private fun props(vararg pairs: Pair<String, JSONObject>): JSONObject {
            val obj = JSONObject()
            pairs.forEach { (key, value) -> obj.put(key, value) }
            return obj
        }

        private fun required(vararg keys: String): JSONArray {
            val array = JSONArray()
            keys.forEach { array.put(it) }
            return array
        }

        private fun strProp(description: String) = JSONObject().put("type", "string").put("description", description)
        private fun intProp(description: String) = JSONObject().put("type", "integer").put("description", description)
        private fun boolProp(description: String) = JSONObject().put("type", "boolean").put("description", description)
        private fun enumProp(values: List<String>) = JSONObject().put("type", "string").put("enum", JSONArray(values))
    }
}

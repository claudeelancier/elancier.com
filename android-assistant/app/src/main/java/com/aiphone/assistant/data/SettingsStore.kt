package com.aiphone.assistant.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.aiphone.assistant.agent.AssistantSettings
import com.aiphone.assistant.agent.ChatMessage
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

class SettingsStore(context: Context) {
    private val plain = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val secrets = openSecrets(context)

    fun load(): AssistantSettings {
        return AssistantSettings(
            provider = plain.getString(KEY_PROVIDER, AssistantSettings().provider) ?: AssistantSettings().provider,
            baseUrl = plain.getString(KEY_BASE_URL, AssistantSettings().baseUrl) ?: AssistantSettings().baseUrl,
            model = plain.getString(KEY_MODEL, AssistantSettings().model) ?: AssistantSettings().model,
            apiKey = secrets.getString(KEY_API_KEY, "") ?: "",
            voiceReplies = plain.getBoolean(KEY_VOICE, true),
        )
    }

    fun save(settings: AssistantSettings) {
        plain.edit()
            .putString(KEY_PROVIDER, settings.provider)
            .putString(KEY_BASE_URL, settings.baseUrl)
            .putString(KEY_MODEL, settings.model)
            .putBoolean(KEY_VOICE, settings.voiceReplies)
            .apply()
        secrets.edit().putString(KEY_API_KEY, settings.apiKey).apply()
    }

    fun loadMessages(): List<ChatMessage> {
        val raw = plain.getString(KEY_MESSAGES, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val role = if (item.optString("role") == "user") ChatMessage.Role.USER else ChatMessage.Role.ASSISTANT
                    val actionsJson = item.optJSONArray("actions")
                    val actions = buildList {
                        if (actionsJson != null) {
                            for (actionIndex in 0 until actionsJson.length()) add(actionsJson.optString(actionIndex))
                        }
                    }
                    add(
                        ChatMessage(
                            id = item.optString("id", index.toString()),
                            role = role,
                            text = item.optString("text"),
                            actions = actions,
                            timestamp = item.optLong("timestamp"),
                        ),
                    )
                }
            }
        } catch (_: JSONException) {
            emptyList()
        }
    }

    fun saveMessages(messages: List<ChatMessage>) {
        val array = JSONArray()
        messages.takeLast(40).forEach { message ->
            array.put(
                JSONObject()
                    .put("id", message.id)
                    .put("role", if (message.role == ChatMessage.Role.USER) "user" else "assistant")
                    .put("text", message.text)
                    .put("timestamp", message.timestamp)
                    .put("actions", JSONArray(message.actions)),
            )
        }
        plain.edit().putString(KEY_MESSAGES, array.toString()).apply()
    }

    private fun openSecrets(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                SECRET_PREFS,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (_: Exception) {
            context.getSharedPreferences(SECRET_FALLBACK, Context.MODE_PRIVATE)
        }
    }

    private companion object {
        const val PREFS = "northstar"
        const val SECRET_PREFS = "northstar_secrets"
        const val SECRET_FALLBACK = "northstar_secrets_fallback"
        const val KEY_PROVIDER = "provider"
        const val KEY_BASE_URL = "base_url"
        const val KEY_MODEL = "model"
        const val KEY_API_KEY = "api_key"
        const val KEY_VOICE = "voice"
        const val KEY_MESSAGES = "messages"
    }
}

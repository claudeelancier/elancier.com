package com.aiphone.assistant.ui

import android.app.Application
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aiphone.assistant.agent.AgentAction
import com.aiphone.assistant.agent.AgentResponseParser
import com.aiphone.assistant.agent.AssistantSettings
import com.aiphone.assistant.agent.ChatMessage
import com.aiphone.assistant.agent.EndpointPolicy
import com.aiphone.assistant.agent.ExecutedAction
import com.aiphone.assistant.agent.LlmClient
import com.aiphone.assistant.agent.LlmException
import com.aiphone.assistant.agent.LlmStep
import com.aiphone.assistant.agent.OfflineInterpreter
import com.aiphone.assistant.agent.ReplyComposer
import com.aiphone.assistant.agent.ToolExecutor
import com.aiphone.assistant.data.SettingsStore
import com.aiphone.assistant.speech.Speaker
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.util.UUID
import kotlin.coroutines.resume

enum class Screen { Chat, Settings }

data class Banner(val id: Int, val text: String)

data class UiState(
    val messages: List<ChatMessage> = emptyList(),
    val draft: String = "",
    val busy: Boolean = false,
    val settings: AssistantSettings = AssistantSettings(),
    val screen: Screen = Screen.Chat,
    val permissionRequest: String? = null,
    val banner: Banner? = null,
)

class AssistantViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SettingsStore(application)
    private val executor = ToolExecutor(application)
    private val client = LlmClient()
    private val speaker = Speaker(application)
    private var bannerId = 0
    private var permissionContinuation: ((Boolean) -> Unit)? = null

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state

    init {
        val saved = store.loadMessages()
        val messages = saved.ifEmpty { listOf(welcome()) }
        _state.value = UiState(messages = messages, settings = store.load())
        if (saved.isEmpty()) store.saveMessages(messages)
    }

    fun updateDraft(value: String) {
        _state.update { it.copy(draft = value) }
    }

    fun openSettings() {
        _state.update { it.copy(screen = Screen.Settings) }
    }

    fun closeSettings() {
        _state.update { it.copy(screen = Screen.Chat) }
    }

    fun toggleVoice() {
        val next = _state.value.settings.copy(voiceReplies = !_state.value.settings.voiceReplies)
        store.save(next)
        _state.update { it.copy(settings = next) }
    }

    fun saveSettings(draft: AssistantSettings) {
        val url = draft.baseUrl.trim().trimEnd('/')
        val key = draft.apiKey.trim()
        val model = draft.model.trim()
        if (model.isBlank()) {
            note("Model name is required.")
            return
        }
        if (key.isNotBlank() && !EndpointPolicy.allow(url)) {
            note("Use an https endpoint. Local http is only allowed for localhost.")
            return
        }
        val saved = draft.copy(baseUrl = url.ifBlank { AssistantSettings().baseUrl }, model = model, apiKey = key)
        store.save(saved)
        _state.update { it.copy(settings = saved, screen = Screen.Chat) }
        note("Settings saved.")
    }

    fun clearChat() {
        val messages = listOf(welcome())
        store.saveMessages(messages)
        _state.update { it.copy(messages = messages, screen = Screen.Chat, draft = "") }
    }

    fun note(text: String) {
        bannerId += 1
        _state.update { it.copy(banner = Banner(bannerId, text)) }
    }

    fun consumeBanner() {
        _state.update { it.copy(banner = null) }
    }

    fun onPermissionResult(granted: Boolean) {
        _state.update { it.copy(permissionRequest = null) }
        val resume = permissionContinuation
        permissionContinuation = null
        resume?.invoke(granted)
    }

    fun submit(text: String) {
        val clean = text.trim()
        if (clean.isEmpty() || _state.value.busy) return
        val user = message(ChatMessage.Role.USER, clean)
        _state.update { it.copy(busy = true, draft = "", messages = it.messages + user) }
        viewModelScope.launch {
            try {
                val history = _state.value.messages
                val finished = produce(history, clean)
                val assistant = message(ChatMessage.Role.ASSISTANT, finished.say, finished.labels)
                val messages = _state.value.messages + assistant
                _state.update { it.copy(messages = messages) }
                store.saveMessages(messages)
                if (_state.value.settings.voiceReplies) speaker.speak(finished.say)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val assistant = message(ChatMessage.Role.ASSISTANT, failureText(e))
                val messages = _state.value.messages + assistant
                _state.update { it.copy(messages = messages) }
                store.saveMessages(messages)
            } finally {
                _state.update { it.copy(busy = false) }
            }
        }
    }

    private suspend fun produce(history: List<ChatMessage>, input: String): Finished {
        val settings = _state.value.settings
        if (settings.apiKey.isBlank()) return offline(input)
        return try {
            cloud(settings, history)
        } catch (e: Exception) {
            val fallback = OfflineInterpreter.interpret(input) ?: throw e
            val executed = executeAll(fallback.actions)
            Finished(
                ReplyComposer.compose("Cloud model didn't answer (${shortError(e)}). ${fallback.say}".trim(), executed.map { it.summary }),
                executed.map { it.label },
            )
        }
    }

    private suspend fun offline(input: String): Finished {
        val turn = OfflineInterpreter.interpret(input)
            ?: return Finished(
                "Add an API key in Settings for open-ended chat. Without one I can still handle the flashlight, battery, time, volume, timers, alarms, reminders, calls, texts, search, and opening apps or settings.",
                emptyList(),
            )
        val executed = executeAll(turn.actions)
        val say = ReplyComposer.compose(turn.say, executed.map { it.summary }).ifBlank { "Done." }
        return Finished(say, executed.map { it.label })
    }

    private suspend fun cloud(settings: AssistantSettings, history: List<ChatMessage>): Finished {
        val messages = client.conversation(history)
        val labels = mutableListOf<String>()
        repeat(4) {
            val step = withContext(Dispatchers.IO) { client.step(settings, messages, includeTools = true) }
            when (step) {
                is LlmStep.Calls -> {
                    messages.put(step.assistantMessage)
                    for (call in step.calls) {
                        val action = AgentResponseParser.parseTool(call.name, call.arguments)
                        val summary = if (action == null) {
                            "Unknown tool '${call.name}'."
                        } else {
                            labels += action.label
                            executeOne(action).summary
                        }
                        messages.put(client.toolMessage(call.id, call.name, summary))
                    }
                }
                is LlmStep.Reply -> {
                    val extras = mutableListOf<String>()
                    for (action in step.actions) {
                        labels += action.label
                        extras += executeOne(action).summary
                    }
                    val say = ReplyComposer.compose(step.say, extras).ifBlank { "Done." }
                    return Finished(say, labels)
                }
            }
        }
        return Finished("I stopped after several tool steps. Try splitting that into a simpler request.", labels)
    }

    private suspend fun executeAll(actions: List<AgentAction>): List<ExecutedAction> {
        return actions.map { executeOne(it) }
    }

    private suspend fun executeOne(action: AgentAction): ExecutedAction {
        val permission = executor.requiredPermission(action)
        if (!ensure(permission)) {
            return ExecutedAction(action.label, "Permission denied, so I didn't ${action.label.lowercase()}.")
        }
        return withContext(Dispatchers.Main) { executor.execute(action) }
    }

    private suspend fun ensure(permission: String?): Boolean {
        if (permission == null) return true
        val granted = ContextCompat.checkSelfPermission(getApplication(), permission) == PackageManager.PERMISSION_GRANTED
        if (granted) return true
        _state.update { it.copy(permissionRequest = permission) }
        return suspendCancellableCoroutine { continuation ->
            permissionContinuation = { value -> continuation.resume(value) }
            continuation.invokeOnCancellation { permissionContinuation = null }
        }
    }

    private fun welcome(): ChatMessage = message(
        ChatMessage.Role.ASSISTANT,
        "I'm Northstar. I run on this phone: flashlight, timers, alarms, calls, texts, settings, and search. " +
            "Add an API key in Settings when you want open-ended conversation.",
    )

    private fun message(role: ChatMessage.Role, text: String, actions: List<String> = emptyList()) = ChatMessage(
        id = UUID.randomUUID().toString(),
        role = role,
        text = text,
        actions = actions,
        timestamp = System.currentTimeMillis(),
    )

    private fun failureText(error: Exception): String = when (error) {
        is LlmException -> error.message ?: "The model request failed."
        else -> "Something went wrong before I could finish that."
    }

    private fun shortError(error: Exception): String {
        return error.message?.lineSequence()?.firstOrNull()?.take(140) ?: "request failed"
    }

    override fun onCleared() {
        speaker.shutdown()
        permissionContinuation = null
        super.onCleared()
    }

    private data class Finished(val say: String, val labels: List<String>)
}

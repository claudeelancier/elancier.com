package com.aiphone.assistant.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.aiphone.assistant.agent.ChatMessage
import com.aiphone.assistant.speech.SpeechInput
import com.aiphone.assistant.ui.theme.Ink
import com.aiphone.assistant.ui.theme.InkRaised
import com.aiphone.assistant.ui.theme.Moss
import com.aiphone.assistant.ui.theme.MossDeep
import com.aiphone.assistant.ui.theme.Muted
import com.aiphone.assistant.ui.theme.Paper
import java.text.DateFormat
import java.util.Date

private val suggestions = listOf(
    "Battery",
    "What time is it?",
    "Flashlight on",
    "Timer for 5 minutes",
    "Open Wi-Fi",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(state: UiState, vm: AssistantViewModel, snackbar: SnackbarHostState) {
    val context = LocalContext.current
    val speech = remember { SpeechInput(context) }
    var listening by remember { mutableStateOf(false) }
    DisposableEffect(speech) {
        onDispose { speech.stop() }
    }

    fun beginListening() {
        speech.start(
            onText = { heard ->
                listening = false
                vm.submit(heard)
            },
            onError = { message ->
                listening = false
                vm.note(message)
            },
            onListening = { listening = it },
        )
    }

    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) beginListening() else vm.note("Microphone permission is needed to talk.")
    }
    val listState = rememberLazyListState()
    LaunchedEffect(state.messages.size, state.busy) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.lastIndex)
    }
    val started = state.messages.any { it.role == ChatMessage.Role.USER }

    Scaffold(
        containerColor = Ink,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Northstar", style = MaterialTheme.typography.titleMedium)
                        Text(
                            if (state.settings.apiKey.isBlank()) "On-device commands" else state.settings.model,
                            style = MaterialTheme.typography.labelSmall,
                            color = Muted,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = vm::toggleVoice) {
                        Icon(
                            if (state.settings.voiceReplies) Icons.AutoMirrored.Filled.VolumeUp else Icons.AutoMirrored.Filled.VolumeOff,
                            contentDescription = "Toggle spoken replies",
                            tint = if (state.settings.voiceReplies) Moss else Muted,
                        )
                    }
                    IconButton(onClick = vm::openSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = Paper)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Ink,
                    titleContentColor = Paper,
                ),
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {
            if (state.busy) {
                LinearProgressIndicator(Modifier.fillMaxWidth(), color = Moss, trackColor = InkRaised)
            }
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.messages, key = { it.id }) { message ->
                    MessageBubble(message)
                }
            }
            if (!started) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    suggestions.forEach { suggestion ->
                        SuggestionChip(
                            onClick = { vm.submit(suggestion) },
                            label = { Text(suggestion) },
                        )
                    }
                }
            }
            Composer(
                draft = state.draft,
                busy = state.busy,
                listening = listening,
                onDraft = vm::updateDraft,
                onSend = { vm.submit(state.draft) },
                onMic = {
                    if (listening) {
                        speech.stop()
                        listening = false
                    } else if (
                        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                        PackageManager.PERMISSION_GRANTED
                    ) {
                        beginListening()
                    } else {
                        micPermission.launch(Manifest.permission.RECORD_AUDIO)
                    }
                },
            )
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val mine = message.role == ChatMessage.Role.USER
    val time = remember(message.timestamp) {
        DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(message.timestamp))
    }
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = if (mine) Alignment.End else Alignment.Start,
    ) {
        Surface(
            color = if (mine) MossDeep else InkRaised,
            shape = RoundedCornerShape(
                topStart = 18.dp,
                topEnd = 18.dp,
                bottomStart = if (mine) 18.dp else 4.dp,
                bottomEnd = if (mine) 4.dp else 18.dp,
            ),
            modifier = Modifier.widthIn(max = 320.dp),
        ) {
            Text(
                message.text,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = Paper,
            )
        }
        if (message.actions.isNotEmpty()) {
            Row(
                Modifier.padding(top = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                message.actions.distinct().forEach { label ->
                    Surface(shape = RoundedCornerShape(999.dp), color = Ink) {
                        Text(
                            label,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Moss,
                        )
                    }
                }
            }
        }
        Text(
            time,
            modifier = Modifier.padding(top = 4.dp, start = 4.dp, end = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = Muted,
            textAlign = if (mine) TextAlign.End else TextAlign.Start,
        )
    }
}

@Composable
private fun Composer(
    draft: String,
    busy: Boolean,
    listening: Boolean,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onMic: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IconButton(onClick = onMic) {
            Icon(
                if (listening) Icons.Filled.Stop else Icons.Filled.Mic,
                contentDescription = if (listening) "Stop listening" else "Speak",
                tint = if (listening) Moss else Paper,
            )
        }
        OutlinedTextField(
            value = draft,
            onValueChange = onDraft,
            modifier = Modifier.weight(1f),
            placeholder = { Text(if (listening) "Listening…" else "Ask Northstar", color = Muted) },
            singleLine = true,
            shape = RoundedCornerShape(24.dp),
        )
        Box(contentAlignment = Alignment.Center) {
            if (busy) {
                CircularProgressIndicator(
                    Modifier.padding(12.dp),
                    color = Moss,
                    strokeWidth = 2.dp,
                )
            } else {
                IconButton(onClick = onSend, enabled = draft.isNotBlank()) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = if (draft.isNotBlank()) Moss else Muted)
                }
            }
        }
    }
}

package com.aiphone.assistant.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.aiphone.assistant.agent.AssistantSettings
import com.aiphone.assistant.agent.ProviderPresets
import com.aiphone.assistant.ui.theme.Ink
import com.aiphone.assistant.ui.theme.Moss
import com.aiphone.assistant.ui.theme.Muted
import com.aiphone.assistant.ui.theme.Paper

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(settings: AssistantSettings, vm: AssistantViewModel, snackbar: SnackbarHostState) {
    var provider by remember(settings) { mutableStateOf(settings.provider) }
    var baseUrl by remember(settings) { mutableStateOf(settings.baseUrl) }
    var model by remember(settings) { mutableStateOf(settings.model) }
    var apiKey by remember(settings) { mutableStateOf(settings.apiKey) }

    Scaffold(
        containerColor = Ink,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = vm::closeSettings) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Paper)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink, titleContentColor = Paper),
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                "Open-ended chat uses any OpenAI-compatible endpoint. The key stays on this phone. Calls and texts still open the system apps so you confirm them.",
                style = MaterialTheme.typography.bodyMedium,
                color = Muted,
            )
            Text("Provider", style = MaterialTheme.typography.labelLarge, color = Paper)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProviderPresets.all.forEach { preset ->
                    FilterChip(
                        selected = provider == preset.id,
                        onClick = {
                            provider = preset.id
                            if (preset.id != ProviderPresets.CUSTOM) {
                                baseUrl = preset.baseUrl
                                model = preset.model
                            }
                        },
                        label = { Text(preset.label) },
                    )
                }
            }
            OutlinedTextField(
                value = baseUrl,
                onValueChange = { baseUrl = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Base URL") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            )
            OutlinedTextField(
                value = model,
                onValueChange = { model = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Model") },
                singleLine = true,
            )
            OutlinedTextField(
                value = apiKey,
                onValueChange = { apiKey = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("API key") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            Text(
                "Leave the key blank to stay on built-in commands. https is required, except localhost for a model running on this machine.",
                style = MaterialTheme.typography.labelSmall,
                color = Muted,
            )
            Button(
                onClick = {
                    vm.saveSettings(
                        settings.copy(
                            provider = provider,
                            baseUrl = baseUrl,
                            model = model,
                            apiKey = apiKey,
                        ),
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save")
            }
            OutlinedButton(onClick = vm::clearChat, modifier = Modifier.fillMaxWidth()) {
                Text("Clear conversation", color = Moss)
            }
        }
    }
}

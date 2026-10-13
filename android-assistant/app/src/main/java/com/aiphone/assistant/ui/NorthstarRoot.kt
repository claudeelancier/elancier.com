package com.aiphone.assistant.ui

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.aiphone.assistant.ui.theme.NorthstarTheme

@Composable
fun NorthstarRoot(vm: AssistantViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        vm.onPermissionResult(granted)
    }

    LaunchedEffect(state.permissionRequest) {
        val permission = state.permissionRequest ?: return@LaunchedEffect
        permissionLauncher.launch(permission)
    }
    LaunchedEffect(state.banner?.id) {
        val banner = state.banner ?: return@LaunchedEffect
        snackbar.showSnackbar(banner.text)
        vm.consumeBanner()
    }
    BackHandler(enabled = state.screen == Screen.Settings) {
        vm.closeSettings()
    }

    NorthstarTheme {
        when (state.screen) {
            Screen.Chat -> ChatScreen(state, vm, snackbar)
            Screen.Settings -> SettingsScreen(state.settings, vm, snackbar)
        }
    }
}

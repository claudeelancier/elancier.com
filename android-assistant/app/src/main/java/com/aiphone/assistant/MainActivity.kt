package com.aiphone.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aiphone.assistant.ui.AssistantViewModel
import com.aiphone.assistant.ui.NorthstarRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val vm: AssistantViewModel = viewModel()
            NorthstarRoot(vm)
        }
    }
}

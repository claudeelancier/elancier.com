package com.aiphone.assistant.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale

class SpeechInput(private val context: Context) {
    private var recognizer: SpeechRecognizer? = null

    fun start(onText: (String) -> Unit, onError: (String) -> Unit, onListening: (Boolean) -> Unit) {
        stop()
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onError("Speech recognition isn't available on this phone.")
            return
        }
        val speech = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = speech
        speech.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = Unit
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() = Unit
            override fun onPartialResults(partialResults: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit

            override fun onResults(results: Bundle) {
                onListening(false)
                val text = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                if (text.isNullOrBlank()) onError("I didn't catch that.") else onText(text)
            }

            override fun onError(error: Int) {
                onListening(false)
                onError(speechError(error))
            }
        })
        onListening(true)
        speech.startListening(
            Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Talk to Northstar")
            },
        )
    }

    fun stop() {
        recognizer?.destroy()
        recognizer = null
    }

    private fun speechError(code: Int): String = when (code) {
        SpeechRecognizer.ERROR_AUDIO -> "The microphone didn't start."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is missing."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
            "Speech recognition needs a network connection on this phone."
        SpeechRecognizer.ERROR_NO_MATCH -> "I didn't catch that."
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognition is busy. Try again."
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "I didn't hear anything."
        else -> "Speech recognition stopped."
    }
}

class Speaker(context: Context) : TextToSpeech.OnInitListener {
    private var ready = false
    private val tts = TextToSpeech(context.applicationContext, this)

    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) return
        ready = true
        tts.language = Locale.getDefault()
    }

    fun speak(text: String) {
        if (!ready || text.isBlank()) return
        tts.speak(text.take(400), TextToSpeech.QUEUE_FLUSH, null, "northstar-${System.currentTimeMillis()}")
    }

    fun shutdown() {
        tts.shutdown()
    }
}

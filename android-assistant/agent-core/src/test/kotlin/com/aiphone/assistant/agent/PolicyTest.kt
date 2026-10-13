package com.aiphone.assistant.agent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PolicyTest {
    @Test
    fun endpoints() {
        assertTrue(EndpointPolicy.allow("https://api.openai.com/v1"))
        assertTrue(EndpointPolicy.allow("http://127.0.0.1:11434/v1"))
        assertTrue(EndpointPolicy.allow("http://10.0.2.2:8080/v1"))
        assertFalse(EndpointPolicy.allow("http://192.168.1.20:11434/v1"))
        assertFalse(EndpointPolicy.allow("https://user:pass@api.openai.com/v1"))
        assertFalse(EndpointPolicy.allow("javascript:alert(1)"))
    }

    @Test
    fun replyComposerSkipsDuplicateLines() {
        assertEquals(
            "Turning the flashlight on.",
            ReplyComposer.compose("Turning the flashlight on.", listOf("Turning the flashlight on.")),
        )
        assertEquals(
            "Checking the phone.\nTime 3:00 PM. Battery 80%.",
            ReplyComposer.compose("Checking the phone.", listOf("Time 3:00 PM. Battery 80%.")),
        )
    }
}

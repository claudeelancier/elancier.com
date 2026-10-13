package com.aiphone.assistant.agent

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LlmClientTest {
    @Test
    fun toolRoundTripThenFinalReply() {
        val server = MockWebServer()
        server.enqueue(
            MockResponse().setBody(
                """
                {"choices":[{"message":{"role":"assistant","content":null,"tool_calls":[
                  {"id":"call_1","type":"function","function":{"name":"device_status","arguments":"{}"}}
                ]}}]}
                """.trimIndent(),
            ),
        )
        server.enqueue(
            MockResponse().setBody(
                """{"choices":[{"message":{"role":"assistant","content":"Battery looks fine."}}]}""",
            ),
        )
        server.start()
        try {
            val settings = settings(server)
            val client = LlmClient()
            val messages = client.conversation(listOf(ChatMessage("1", ChatMessage.Role.USER, "How's my battery?")))
            val first = client.step(settings, messages, includeTools = true) as LlmStep.Calls
            assertEquals("device_status", first.calls.single().name)
            messages.put(first.assistantMessage)
            messages.put(client.toolMessage("call_1", "device_status", "Time 3:00 PM. Battery 80%, charging."))
            val second = client.step(settings, messages, includeTools = true) as LlmStep.Reply
            assertEquals("Battery looks fine.", second.say)

            val recorded = server.takeRequest()
            assertEquals("Bearer secret-key", recorded.getHeader("Authorization"))
            val followUp = server.takeRequest().body.readUtf8()
            assertTrue(followUp.contains("Battery 80%"))
            assertFalse(followUp.contains("secret-key"))
        } finally {
            server.shutdown()
        }
    }

    @Test
    fun retriesWithoutToolsWhenTheProviderRejectsThem() {
        val server = MockWebServer()
        server.enqueue(
            MockResponse().setResponseCode(400).setBody("""{"error":{"message":"tools are not supported"}}"""),
        )
        server.enqueue(
            MockResponse().setBody(
                """{"choices":[{"message":{"content":"{\"say\":\"On.\",\"actions\":[{\"name\":\"flashlight\",\"args\":{\"on\":true}}]}"}}]}""",
            ),
        )
        server.start()
        try {
            val reply = LlmClient().step(settings(server), LlmClient().conversation(emptyList()), includeTools = true) as LlmStep.Reply
            assertEquals("On.", reply.say)
            assertEquals(AgentAction.Flashlight(true), reply.actions.single())
            assertTrue(server.takeRequest().body.readUtf8().contains("\"tools\""))
            assertFalse(server.takeRequest().body.readUtf8().contains("\"tools\""))
        } finally {
            server.shutdown()
        }
    }

    @Test
    fun errorsDoNotEchoTheApiKey() {
        val server = MockWebServer()
        server.enqueue(
            MockResponse().setResponseCode(401).setBody("""{"error":{"message":"invalid api key"}}"""),
        )
        server.start()
        try {
            try {
                LlmClient().step(settings(server), LlmClient().conversation(emptyList()), includeTools = true)
                throw AssertionError("expected LlmException")
            } catch (e: LlmException) {
                assertTrue(e.message!!.contains("invalid api key"))
                assertFalse(e.message!!.contains("secret-key"))
            }
        } finally {
            server.shutdown()
        }
    }

    @Test
    fun blocksNonLocalHttp() {
        val client = LlmClient()
        val messages = client.conversation(emptyList())
        try {
            client.step(
                AssistantSettings(baseUrl = "http://example.com/v1", apiKey = "secret-key", model = "test"),
                messages,
                includeTools = false,
            )
            throw AssertionError("expected LlmException")
        } catch (e: LlmException) {
            assertTrue(e.message!!.contains("https"))
        }
    }

    private fun settings(server: MockWebServer): AssistantSettings {
        val base = server.url("/v1").toString().trimEnd('/')
        return AssistantSettings(baseUrl = base, apiKey = "secret-key", model = "test-model")
    }
}

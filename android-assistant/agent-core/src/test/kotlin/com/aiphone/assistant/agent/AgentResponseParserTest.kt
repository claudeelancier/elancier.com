package com.aiphone.assistant.agent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AgentResponseParserTest {
    @Test
    fun readsFencedJson() {
        val turn = AgentResponseParser.parseLoose(
            """
            Sure.
            ```json
            {"say":"On.","actions":[{"name":"flashlight","args":{"on":true}}]}
            ```
            """.trimIndent(),
        )
        assertEquals("On.", turn.say)
        assertEquals(AgentAction.Flashlight(true), turn.actions.single())
    }

    @Test
    fun plainTextStaysPlainText() {
        val turn = AgentResponseParser.parseLoose("Hello there")
        assertEquals("Hello there", turn.say)
        assertTrue(turn.actions.isEmpty())
    }

    @Test
    fun parsesToolArguments() {
        val action = AgentResponseParser.parseTool("timer", """{"seconds":"30","label":"tea"}""")
        assertEquals(AgentAction.Timer(30, "tea"), action)
        assertNull(AgentResponseParser.parseTool("dial", """{"number":"mom"}"""))
        assertNull(AgentResponseParser.parseTool("launch_missile", "{}"))
    }
}

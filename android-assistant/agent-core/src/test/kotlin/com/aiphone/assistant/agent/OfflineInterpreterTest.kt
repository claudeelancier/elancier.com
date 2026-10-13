package com.aiphone.assistant.agent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineInterpreterTest {
    @Test
    fun flashlightOnAndOff() {
        val on = OfflineInterpreter.interpret("Turn on the flashlight")
        assertEquals(AgentAction.Flashlight(true), on?.actions?.single())
        val off = OfflineInterpreter.interpret("torch off")
        assertEquals(AgentAction.Flashlight(false), off?.actions?.single())
    }

    @Test
    fun batteryAndTime() {
        assertTrue(OfflineInterpreter.interpret("battery")?.actions?.single() is AgentAction.DeviceStatus)
        assertTrue(OfflineInterpreter.interpret("what time is it?")?.actions?.single() is AgentAction.Clock)
    }

    @Test
    fun timerAndReminder() {
        val timer = OfflineInterpreter.interpret("set a timer for 5 minutes")
        assertEquals(AgentAction.Timer(300, "Timer"), timer?.actions?.single())
        assertTrue(timer!!.say.contains("5 minutes"))

        val reminder = OfflineInterpreter.interpret("remind me to stretch in 10 minutes")
        val action = reminder?.actions?.single() as AgentAction.Notify
        assertEquals("stretch", action.body)
        assertEquals(600, action.delaySeconds)
    }

    @Test
    fun alarmConvertsPm() {
        val turn = OfflineInterpreter.interpret("wake me at 6:15 pm")
        assertEquals(AgentAction.Alarm(18, 15, "Alarm"), turn?.actions?.single())
        assertTrue(turn!!.say.contains("6:15 PM"))
    }

    @Test
    fun callAndTextKeepOriginalCasing() {
        val call = OfflineInterpreter.interpret("call +1 (555) 010-1234")
        assertEquals(AgentAction.Dial("+15550101234"), call?.actions?.single())

        val text = OfflineInterpreter.interpret("text 5550100 I'm on my way")
        assertEquals(AgentAction.Sms("5550100", "I'm on my way"), text?.actions?.single())
    }

    @Test
    fun callWithoutNumberDoesNotInventAContact() {
        val turn = OfflineInterpreter.interpret("call mom")
        assertTrue(turn!!.actions.isEmpty())
        assertTrue(turn.say.contains("contacts"))
    }

    @Test
    fun settingsSearchAndCalendar() {
        assertEquals(
            AgentAction.OpenSettings("wifi"),
            OfflineInterpreter.interpret("open Wi-Fi")?.actions?.single(),
        )
        val search = OfflineInterpreter.interpret("search for Kotlin sealed classes")
        assertEquals(AgentAction.WebSearch("Kotlin sealed classes"), search?.actions?.single())
        val event = OfflineInterpreter.interpret("schedule a meeting Design review in 45 minutes")
        val calendar = event?.actions?.single() as AgentAction.CalendarEvent
        assertEquals("Design review", calendar.title)
        assertEquals(45, calendar.minutesFromNow)
    }

    @Test
    fun openEndedChatIsNotForcedOffline() {
        assertNull(OfflineInterpreter.interpret("What should I cook tonight?"))
    }

    @Test
    fun rejectsOversizedTimer() {
        val turn = OfflineInterpreter.interpret("timer for 30 hours")
        assertTrue(turn!!.actions.isEmpty())
    }
}

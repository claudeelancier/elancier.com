# Northstar

Installable Android assistant. It runs phone commands on the device, and uses an OpenAI-compatible model when you want open-ended chat.

The app does not read your contacts, messages, notifications, or other apps. Calls and texts open the system dialer and SMS composer so you confirm them before anything is sent.

## 1. Open the project

1. Install [Android Studio](https://developer.android.com/studio) (JDK 17 or newer is enough).
2. Open the `android-assistant` directory, not the repository root.
3. Let Studio install the Android 35 SDK and Build-Tools 35 if they are missing.
4. If you build from a terminal instead, create `local.properties` in this directory:

```
sdk.dir=/path/to/Android/Sdk
```

## 2. Build and install

```bash
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The debug APK is signed with the Android debug key and can be installed on a phone with USB debugging, or sideloaded. `minSdk` is 26 (Android 8).

## 3. Use it without an API key

These phrases work with no network and no account:

- `flashlight on` / `flashlight off`
- `battery` / `what time is it?`
- `volume up` / `volume down` / `mute`
- `timer for 5 minutes`
- `wake me at 6:15 pm`
- `remind me to stretch in 10 minutes`
- `call 5550100` (opens the dialer; it does not place the call)
- `text 5550100 I'm on my way` (opens a draft; it does not send)
- `open Wi-Fi` / `open YouTube`
- `search for weather`
- `schedule a meeting Design review in 45 minutes`
- `share Bring the charger`

The microphone button uses Android speech recognition. The speaker icon speaks replies with the system text-to-speech voice.

## 4. Add a cloud model

Open Settings and pick a provider, or point Base URL at any service that implements `POST /v1/chat/completions`:

| Provider | Base URL | Example model |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| Local | `http://127.0.0.1:PORT/v1` or `http://10.0.2.2:PORT/v1` | your model id |

The API key is stored with the Android keystore (`EncryptedSharedPreferences`). Cloud backups are turned off. Only `https` endpoints are allowed, plus localhost and the emulator host `10.0.2.2`, so a key is not sent to a random cleartext address.

If the provider rejects tool calling, Northstar retries once without tools and accepts a JSON action envelope instead.

## 5. How a turn works

1. The phrase is matched by `OfflineInterpreter` when no API key is saved.
2. With a key, `LlmClient` sends the last conversation turns plus a tool list.
3. Tool calls come back as OpenAI `tool_calls`, or as `{"say","actions"}` JSON.
4. `ToolExecutor` runs each action on the phone and returns a short result.
5. The model gets that result and writes the sentence you see (and hear, if voice is on). The loop stops after four model rounds.

`agent-core` is plain Kotlin. `app` is Jetpack Compose, speech, notifications, and Android intents.

## 6. Add a tool

1. Add a subtype to `AgentAction` in `agent-core`.
2. Teach `AgentResponseParser.actionFrom` the JSON name and arguments.
3. Add the same name to `LlmClient` tool specs and, if it should work offline, a phrase in `OfflineInterpreter`.
4. Handle it in `ToolExecutor.execute`. Request a runtime permission from `requiredPermission` only when the action needs one.
5. Cover the parser or phrase in `agent-core/src/test`.

Prefer an `Intent` that leaves the user on a system screen (dialer, SMS, clock, calendar, settings) over a permission that reads private data.

## 7. What this version does not do

- It does not install an accessibility service, notification listener, or device-admin receiver.
- It does not read the call log, SMS inbox, or contacts.
- It does not run as a default assistant from the lock screen. That would be a separate `VoiceInteractionService` if you want “Hey Google”-style invocation later.
- Release builds are not minified. Sign a release keystore before shipping outside a test phone:

```bash
./gradlew :app:assembleRelease
```

Then sign `app-release-unsigned.apk` with your own key, or add a `signingConfig` in `app/build.gradle.kts`.

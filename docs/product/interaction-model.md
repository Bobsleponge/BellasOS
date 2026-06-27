# BellasOS Interaction Model

How users act within BellasOS across all input modalities.

**Related:** [jarvis-behavior](./jarvis-behavior.md) | [experience-model](./experience-model.md)

---

## Interaction primitives

| Primitive | User intent | Outcome |
|-----------|-------------|---------|
| **Ask** | Question or command to Jarvis | Reasoning, action, or application launch |
| **Search** | Find something | Retrieval across entities, apps, memory, research |
| **Open** | Go deeper | Application layers into workspace |
| **Act** | Change something in the world | Confirm if needed; execute; report |
| **Remember** | Persist knowledge | Memory promotion with confirmation |
| **Forget** | Remove knowledge | Memory deletion or stop surfacing |
| **Switch** | Change context | Venture, mode, or focus update |

---

## Modality priority

1. **Voice** — primary for ambient and hands-free
2. **Text** — primary for precision and review
3. **Search** — primary for retrieval and jump navigation
4. **Gesture** — optional accelerant when camera enabled
5. **Direct manipulation** — when inside an application

All modalities share the same context stack. Switching mid-task is seamless.

---

## Feedback states

User-visible states only:

```
Idle -> Listening -> Thinking -> Speaking / Showing -> Done
```

Never expose: transcribing pipeline, agent routing, model selection, degraded infrastructure details.

Errors: human language with recovery path. "I can't reach Harvi right now. Retry or work offline?"

---

## Search experience

Search is a **primary interaction**, equal to conversation.

### Scopes

| Scope | Examples |
|-------|----------|
| **Global** | "mining exposure" — blended ranked results |
| **Entity** | "TruAfrica Q3 project" |
| **Application** | "Finance" — open Wealth |
| **Memory** | "What did I decide about pricing?" |
| **Research** | "NVIDIA report" |
| **Intelligence** | "mining alert" |

### Entry points

- Omnibox on Home (always visible)
- Keyboard shortcut
- Voice: "Search for..."
- Gesture: circle in air (when camera enabled)

### Search vs Jarvis

| Search | Jarvis |
|--------|--------|
| Retrieves | Reasons and acts |
| Points to artifact | Synthesizes and recommends |
| Fast lookup | Multi-step workflows |

Handoff: select result -> "Tell me more about this" -> Jarvis with context loaded.

### Search feel

- Instant suggestions while typing
- Recent items and applications prioritized
- Empty results: "I can research that for you" — never a dead end
- History private and clearable

---

## Voice experience

| Mode | When | Behavior |
|------|------|----------|
| **Ambient listening** | Opt-in home/office | Wake word; persistent indicator when active |
| **Push-to-talk** | Default in shared spaces | Hold or tap mic |
| **Conversation** | Extended dialog | Natural turn-taking; user can interrupt |
| **Command** | Short actions | "Turn off the lights" — no preamble |
| **Dictation** | Capture text | Writes to note or active field |

**Universal rules:**
- Live captions always visible during speech in and out
- TTS skippable ("Stop" / closed fist gesture)
- "Stop" cancels current action and returns to listening or idle
- Never expose STT/TTS technology names to user

---

## Gesture experience

Gestures are **invisible until camera is enabled**. Tutorial on first enable. Never required for any workflow.

| Gesture | Action | Context |
|---------|--------|---------|
| Open palm hold (1s) | Activate Jarvis listening | Global |
| Point | Select focused item | Navigation |
| Pinch | Confirm selection | Open, approve |
| Swipe left | Back | In application |
| Swipe right | Forward | In application |
| Swipe up | Open Today | Global |
| Swipe down | Close / dismiss | Application or overlay |
| Closed fist hold | Stop / cancel | During Jarvis speech or action |
| Two-hand spread | Enter Presentation mode | Meetings |
| Circle in air | Open search | Global |

Gestures supplement voice and search — they do not replace them.

---

## Camera experience

| Capability | User benefit |
|------------|------------|
| **Presence** | Pause briefing when room empty; resume on return |
| **Attention** | Pause TTS when user looks away |
| **Gesture tracking** | Hands-free control |
| **Workspace awareness** | Future: layout adaptation (standing vs seated) |

### Privacy model

- Camera **off by default**
- Clear indicator when camera active
- No video stored unless user explicitly records (e.g. meeting capture)
- Local processing preferred — communicated as product promise
- One-click disable always visible when camera features enabled
- Gesture preview is opt-in and can be hidden (invisible gestures still work)

---

## Conversation patterns

- Thread by topic, not by session timestamp alone
- Rich cards for data; prose for reasoning
- Follow-ups implicit within active context
- Long content collapsible with expand
- User can pin a thread to Focus

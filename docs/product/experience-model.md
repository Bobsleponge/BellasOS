# BellasOS Experience Model

Master document for how BellasOS feels to use every day.

**Related:** [product-principles](./product-principles.md) | [jarvis-behavior](./jarvis-behavior.md) | [navigation-model](./navigation-model.md)

---

## Experience north star

BellasOS is the **environment you operate within for 8+ hours** — a calm, intelligent command center for life, business, knowledge, and automation.

When BellasOS starts, the user should immediately understand:

- **This is my day** (Today)
- **Jarvis is here** (primary interface)
- **I can speak, type, or search** (three equal paths to action)

Attention is the scarce resource. The experience protects focus and surfaces only what deserves it.

---

## Home experience

### First load is Today

Not a desktop of icons. Not a module sidebar. Not an empty chat waiting for a prompt. Not a Command Center dashboard.

**Today** is the home surface: a prioritized stack of what matters now, with Jarvis present and search always reachable.

### ASCII wireframe (conceptual)

```
+----------------------------------------------------------+
|  [Business v]                    [Search]         09:41  |
|                                                          |
|                    ( Jarvis presence )                   |
|           "Good morning. Two items need you."            |
|                                                          |
|  +-- Today -------------------------------------------+  |
|  |  Approval: LinkedIn draft ready                    |  |
|  |  TruAfrica: Q3 milestone due Friday                 |  |
|  |  Wealth: net worth +2.1% this week                  |  |
|  |  Intelligence: mining sector alert (expand)         |  |
|  +----------------------------------------------------+  |
|                                                          |
|  [ Speak ]   [ Type to Jarvis...              ] [Send]   |
|                                                          |
|  Open: Wealth · Research          Connected              |
+----------------------------------------------------------+
```

### Visible on Home

| Element | Purpose |
|---------|---------|
| **Today stack** | 5-7 prioritized items max; rest under "More" |
| **Jarvis presence** | Visual state (idle, attentive, working) + one contextual line |
| **Universal search** | One keystroke or voice command away |
| **Mode indicator** | Personal / Business / Wealth / Research / Focus |
| **Open applications strip** | Only when multitasking |
| **Connection status** | Human language: Connected / Working offline |

### Hidden on Home

- Module lists, enable/disable toggles, connector counts
- Agent runners, ingestion controls, system health metrics
- Raw data, JSON, debug traces
- Command Center as default destination
- Technical names (finance-tracker, portfolio module, etc.)

### Executive home (Mission Control merge)

Today and Mission Control merge into **one surface at `/`**. The user understands their situation in under 10 seconds without opening tabs or Developer Mode.

**Zone layout (top to bottom):** Mode chip and search; Current Focus (workspace, session, rhythm); Jarvis Recommends (primary CTA); three-column row for Goals, Decision queue, Recent progress; Opportunities and Risks (max 3 each); Today stack; Jarvis presence and application launcher.

**Data sources:** `GET /jarvis/briefing`, `GET /today`, `GET /goals`, `GET /goals/progress`, `GET /decisions`, workspace context, focus session APIs. Depth via `/?section=` anchors; `/mission` redirects to `/`.

### What Jarvis does on load

**Proactive (configurable):**
- Morning: one-sentence brief + populated Today
- Other times: silent readiness unless alert threshold met

**Always reactive:**
- Voice, text, and search
- "What's on Today?" / "Switch to personal" / "Open Wealth"

---

## Daily operating experience

### Starting the day

Overnight, BellasOS assembles Today: approvals, deadlines, wealth delta, intelligence items, automation items due.

User opens BellasOS and receives a optional spoken one-liner plus expandable Today cards. User confirms or reprioritizes through conversation — not by rearranging a dashboard.

### Morning briefing

- **Duration:** 30-90 seconds spoken; expandable written cards
- **Structure:** overnight changes, approvals, venture deadlines, wealth delta, top intelligence (max 3 items)
- **Tone:** Calm, factual, actionable
- User can dismiss, snooze, or drill in via Jarvis

### Research sessions

1. User scopes in conversation: "Research the South African fintech landscape"
2. Jarvis confirms scope; deep work runs asynchronously
3. User continues other work; notification when ready (Info level — see notification philosophy)
4. Result appears as **Research card** in conversation thread and in Research application
5. Follow-ups use context: "How does this affect TruAfrica?"

### Business management

- Venture context via language: "For Harvi..." or Business mode
- **Harvi and Co** and **TruAfrica** applications open for operational depth
- Cross-venture questions through Jarvis: "Compare pipeline at Harvi and TruAfrica"
- No merged admin view — BellasOS synthesizes; each venture app owns its records

### Finance reviews

- Conversational first: "How am I doing?" yields live summary card
- **Wealth** application optional for exploration
- Jarvis attributes live data: "From Finance Tracker, as of today..."
- Past decisions referenced: "Last time you considered increasing mining exposure..."

### Project work

- **Focus mode** pins one project; Today filters accordingly
- **Coding Studio** opens for build/refine workflows
- Jarvis maintains project thread across sessions

### Brainstorming

- Open-ended dialog with Jarvis
- Ideas captured only on confirmation — not every message becomes memory
- "Turn this into a project" creates entity and offers to open venture app

### Automation management

Automations appear as **plain-language Today items**, never as an admin panel:

- "LinkedIn post publishes today at 3pm"
- "Approve publish?"
- "Weekly sector brief runs Monday 6am"

User approves, snoozes, or asks Jarvis for detail.

### End of day

- Optional evening synthesis: "Here's what moved today"
- Prompt to record decisions discussed but not captured
- Tomorrow's priorities seeded silently overnight
- Jarvis reduces proactive behavior; environment settles to rest state

---

## Application experience (summary)

An **application** is a named depth surface: Wealth, Harvi and Co, TruAfrica, Research, Intelligence, Automation, Coding Studio, Communications.

| Action | Behavior |
|--------|----------|
| **Open** | Jarvis command, Search, Today tap, or gesture — app layers into workspace; Jarvis remains |
| **Work** | User manipulates app; Jarvis answers questions about what's on screen |
| **Close** | "Back to Today" — context summarized for resume later |

Jarvis **annotates** applications; it does not duplicate them.

Full navigation detail: [navigation-model](./navigation-model.md)

---

## Memory experience (user view)

Users never see memory tiers or storage classes. They see **what Jarvis remembers**:

| Category | Examples |
|----------|----------|
| **Preferences** | "You prefer brief morning briefings" |
| **Decisions** | "On 12 March you chose to delay TruAfrica pricing" |
| **People** | "John advises on tax for the Trust" |
| **Instructions** | "Brief me on mining every Monday" |
| **Topics** | Synthesized profiles from research and intelligence |

**Surfacing:** In conversation with attribution ("Based on what you told me in March...")

**Memory browser:** Invited depth — "What do you know about me?" / "Show memory about John"

**Edit and forget:** Tap to edit; "Forget that" with confirmation

**Trust:** Transparent sources; instant correction; no surveillance framing ("I remember what you asked me to remember")

---

## Eight hours in BellasOS

| Phase | Feeling |
|-------|---------|
| **Arrival** | Ready — the room is prepared |
| **Flow** | Capable — depth when needed, Jarvis always available |
| **Closure** | Resolved — day summarized, tomorrow seeded |

**Non-fatigue design:**
- Low notification budget
- No dashboard refresh anxiety
- Progressive disclosure
- Max 5-7 items on Today by default
- Intelligence batched, not streamed

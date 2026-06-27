#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'docs', 'product');
mkdirSync(dir, { recursive: true });

const files = {
  'README.md': `# BellasOS Product Design

User experience and interaction specifications for BellasOS. These documents define **how the product feels and behaves** from the user's perspective.

**Source of truth for structure and behavior:** [operating-model](../operating-model/README.md)

**Entry point:** [experience-model.md](./experience-model.md)

---

## Documents

| Document | Contents |
|----------|----------|
| [product-principles.md](./product-principles.md) | Principles, personality, differentiation |
| [experience-model.md](./experience-model.md) | Home, daily rhythm, applications, memory, emotional design |
| [jarvis-behavior.md](./jarvis-behavior.md) | Jarvis conversation, proactive/reactive behavior, dialogues |
| [interaction-model.md](./interaction-model.md) | Primitives, search, voice, gesture, camera |
| [navigation-model.md](./navigation-model.md) | How users move through BellasOS |
| [workspace-model.md](./workspace-model.md) | Modes, layers, multitasking, Developer Mode |
| [intelligence-model.md](./intelligence-model.md) | Briefings, alerts, surfacing without noise |
| [notification-philosophy.md](./notification-philosophy.md) | What earns an interrupt |

---

## Design constraints

- BellasOS is a **Personal Intelligence Operating System**, not a dashboard, admin panel, chatbot, or website.
- **Jarvis** is the primary interface.
- **Applications** are user-facing; platform machinery stays hidden.
- Designed for **8+ hours daily use**: calm, minimal, intelligent, non-fatiguing.
`,

  'product-principles.md': `# BellasOS Product Principles

Foundation for all product, UX, and visual design decisions.

**Related:** [operating-model](../operating-model/README.md) | [experience-model](./experience-model.md)

---

## Product principles

1. **Today is home** — Not a dashboard, app grid, or empty chat. The user lands on what matters now.
2. **Jarvis is the default interface** — Applications are depth surfaces; Jarvis is how you live in the OS.
3. **Hide the machine** — Users never see modules, agents, connectors, or infrastructure in normal use.
4. **Context is continuous** — Across voice, text, apps, ventures, and days. Jarvis knows where you are.
5. **Intelligence arrives** — Briefings and alerts find the user; users do not hunt dashboards.
6. **Memory is transparent** — Jarvis remembers with attribution; users can view, edit, and forget.
7. **Notifications earn their interrupt** — Calm by default; batch over ping.
8. **Search equals conversation** — Two doors to the same room: retrieve (search) and reason (Jarvis).
9. **External applications stay authoritative** — BellasOS unifies and intelligence-layer; it does not duplicate ledgers or venture records.
10. **Developer depth stays hidden** — Powerful diagnostics exist; normal users never stumble into them.
11. **Calm over clever** — No gamification, no startup fanfare, no anxiety-inducing refresh cycles.
12. **Focus is sacred** — Focus mode suppresses non-critical interruption.

---

## Jarvis personality

| Attribute | Guideline |
|-----------|-----------|
| Tone | Professional but warm; first-name basis |
| Length | Brief first; elaborate only when asked |
| Confidence | States uncertainty clearly; never bluffs |
| Humor | Minimal; never snarky or performative |
| Proactivity | Chief-of-staff helpfulness, not nagging |

**Good:** "Net worth is R12.4M, up 2.1% this week. Want the breakdown?"

**Bad:** "Sure! I'd be happy to help you with that! Let me pull that up for you!"

---

## BellasOS emotional design

- **Calm** — Dark, spacious environment; low visual noise
- **Intelligent** — Responses and surfaces feel considered, not generic
- **Useful** — Every visible element earns its place on Today
- **Non-fatiguing** — Sustainable for 8+ hours; progressive disclosure over density

Motion is purposeful: transitions signal state change, not decoration.

---

## Differentiation

| Compared to | BellasOS |
|-------------|----------|
| **ChatGPT** | Remembers across days; acts on your real systems; opens applications; proactive briefings |
| **Notion** | Intelligence and orchestration layer, not a document store; Jarvis not pages |
| **Home Assistant** | Whole life and business OS; home is one domain among many |
| **Traditional OS** | Built for one person's life, ventures, wealth, and knowledge — not generic computing |

---

## What makes BellasOS unique

1. **One intelligence across all owned systems** — Finance Tracker, Harvi, TruAfrica, and future apps through one presence (Jarvis).
2. **Acts, not just answers** — Writes to systems of record with approval and audit, not chat-only suggestions.
3. **Decisions are remembered** — Strategic continuity across weeks and months.
4. **Applications when you need depth** — Jarvis for life; apps for work on detail.
5. **Future modalities as optional layers** — Voice, gesture, and camera enhance; they never replace conversation and search.

---

## Relationship to the operating model

The [operating model](../operating-model/README.md) defines what BellasOS organizes (domains, entities, applications, memory, agents). This product layer defines **how that organization feels** to the user. Domains, specialist agents, and platform modules remain internal — users think in businesses, projects, wealth, research, and applications.
`,

  'experience-model.md': `# BellasOS Experience Model

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

\`\`\`
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
\`\`\`

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
`,

};

Object.assign(files, {
  'jarvis-behavior.md': `# Jarvis Behavior Specification

Definitive product specification for Jarvis — the sole user-facing intelligence of BellasOS.

**Related:** [operating-model/daily-os-jarvis](../operating-model/daily-os-jarvis.md) | [experience-model](./experience-model.md) | [interaction-model](./interaction-model.md)

---

## Role

Jarvis is executive assistant, strategist, and operator. One voice. One persona. Specialist capabilities work invisibly behind Jarvis — users never interact with Research Agent, Wealth Agent, or similar labels.

---

## Conversation model

- **Topic threads** — Wealth, TruAfrica launch, Research NVIDIA — not one endless scroll
- **Rich responses** — cards, metrics, citations, action buttons; not walls of text
- **Brevity default** — 2-4 sentences; "Want detail?" for depth
- **Context-aware follow-ups** — "And the transactions?" understood in active wealth context
- **Explainable context** — User can ask: "Why are you answering about TruAfrica?"

---

## Memory model (behavior)

| Situation | Jarvis behavior |
|-----------|-----------------|
| Personalization | Uses memory silently |
| User asks | Recalls with attribution and date |
| "Remember this" | Promotes to durable memory; confirms |
| "Forget that" | Removes or stops surfacing; confirms |
| Correction | Updates immediately; supersedes old fact |

Jarvis never claims to remember what it does not. Jarvis never cites memory for live financial data when a live query is available.

---

## Brainstorming model

1. Exploratory, low-structure dialog
2. Jarvis asks clarifying questions sparingly
3. Captures Notes, Goals, or Projects only on user confirmation
4. "Turn this into a project" — creates entity, offers to open venture application

---

## Application launching

| Trigger | Behavior |
|---------|----------|
| Explicit | "Open Wealth" — brief announcement, app layers in |
| Implicit | "Show my holdings" — inline card if sufficient; Wealth app if visual exploration needed |
| From Today | Tap item opens relevant application with context |

Jarvis never routes to module panels or Command Center for normal tasks.

---

## External systems interaction

- **Finance Tracker, Harvi, TruAfrica** queried live when freshness matters
- **Attribution when relevant:** "From Finance Tracker, as of today..."
- **Errors in plain language:** "I can't reach Finance Tracker. Want to connect it?"
- **Write actions** execute on external system after confirmation; Jarvis reports outcome

User experiences one unified answer; federation is invisible unless sourcing matters for trust.

---

## Proactive behavior

**Jarvis initiates when:**
- Morning briefing window (user-configured)
- Approval pending beyond threshold
- User-initiated research completes
- Critical alert (user-defined threshold)
- Meeting prep window (future calendar integration)

**Jarvis never initiates when:**
- Focus mode active
- Presentation mode active
- Quiet hours configured
- Non-critical intelligence (batched into next briefing instead)

Proactive messages are short, actionable, and dismissible.

---

## Reactive behavior

Jarvis always responds to:
- Direct address (wake word, "Jarvis", push-to-talk)
- Text input
- Search handoff ("Tell me more about this")
- Questions about visible application content
- Mode or venture switches ("For Harvi...", "Personal mode")

---

## Approval behavior

1. State consequence in plain language
2. One primary action (Approve / Decline)
3. Optional secondary (Edit / Snooze)
4. On approve, link to decision memory when significant

Example: "This will publish your LinkedIn draft to 2,400 followers. Approve?"

---

## Not a chatbot

Jarvis differs because it:
- Remembers across days and corrects
- Acts on real systems with approval
- Initiates when appropriate
- Opens applications for depth
- Cites sources and admits gaps
- Maintains context across voice, text, and applications

---

## Example dialogues

### Morning arrival

**Jarvis:** "Morning. Net worth up 2.1% this week. TruAfrica milestone Friday. One approval waiting — LinkedIn draft."

**User:** "What's the approval?"

**Jarvis:** "Draft post on sector trends, scheduled for 3pm. Want to review?" [Review] [Approve] [Snooze]

### Finance

**User:** "How am I doing financially?"

**Jarvis:** "Net worth R12.4M, up 2.1% this week. Cashflow positive. Largest move: mining holdings +4.2%. From Finance Tracker, live." [Breakdown] [Open Wealth]

### Venture

**User:** "For TruAfrica — what's blocking the launch?"

**Jarvis:** "Three open tasks: payment integration, legal review, app store assets. Legal review blocks the others. Want detail on any of these?" [Open TruAfrica]

### Research

**User:** "Research NVIDIA's data center strategy."

**Jarvis:** "I'll run deep research — typically 10-15 minutes. I'll notify you when it's ready."

*(Later)*

**Jarvis:** "Research ready: NVIDIA Data Center Strategy. Key finding: Blackwell ramp driving 40% of revenue growth." [Read summary] [Open Research]

### Approval

**User:** "Publish it."

**Jarvis:** "This posts to LinkedIn immediately. Approve?" [Approve] [Cancel]
`,

  'interaction-model.md': `# BellasOS Interaction Model

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

\`\`\`
Idle -> Listening -> Thinking -> Speaking / Showing -> Done
\`\`\`

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
`,

  'navigation-model.md': `# BellasOS Navigation Model

How users move through BellasOS without routes, modules, or technical concepts.

**Related:** [workspace-model](./workspace-model.md) | [experience-model](./experience-model.md)

---

## Navigation hierarchy

\`\`\`
Today (Home)
  |-- Jarvis (conversation / search)
  |-- Application (depth)
  |     \-- Jarvis companion (optional)
  |-- Memory / History (invited depth)
  \-- Developer Mode (overlay — not a destination)
\`\`\`

There is no parallel "admin home." Command Center concepts map to Developer Mode only.

---

## Primary navigation paths

| Intent | Path |
|--------|------|
| Go deeper | Jarvis "Open Wealth" / Search / Today item / gesture |
| Return home | "Back to Today" / swipe up / close all apps |
| Switch application | Jarvis mediates — "Take me to Research" |
| Switch venture | "For TruAfrica..." / Business mode / Search entity |
| Switch mode | Mode chip or voice: "Personal mode" / "Focus on Q3 launch" |

Applications do **not** link to each other directly. Jarvis preserves context across transitions.

---

## Application catalog (user mental model)

| Application | User says | Opens for |
|-------------|-----------|-----------|
| **Wealth** | "Finance", "net worth", "holdings" | Finance Tracker + portfolio analysis |
| **Harvi and Co** | "Harvi", "Harvi projects" | Venture operations |
| **TruAfrica** | "TruAfrica" | Venture operations |
| **Research** | "Research", "my reports" | Research archive and deep runs |
| **Intelligence** | "Briefings", "alerts", "sectors" | Monitored world intelligence |
| **Automation** | "Home", "lights", "devices" | Environment control |
| **Coding Studio** | "Coding", "my projects" | Build and refine artifacts |
| **Communications** | "Social", "drafts", "LinkedIn" | Content pipeline |

User never hears: finance-tracker, bellasos.portfolio, module IDs, or bridge names.

---

## Context maintenance

- **Venture badge** on application chrome when venture-scoped
- **Jarvis thread** persists across application open/close
- **Application state** restored on return (scroll, focus, filters)
- **Explainability:** "Why am I seeing this?" — Jarvis cites active venture, focus entity, or mode

---

## What navigation must never do

- Expose module enable/disable in normal paths
- Default user to operator console or module list
- Trap user in embedded application without Jarvis reachable
- Require understanding internal finance fragmentation (portfolio vs tracker vs finance module)
- Use technical URLs as user mental model (/console?view=module:...)

---

## First-run navigation

1. Jarvis welcome (one sentence)
2. Name and preference (brief vs detailed responses)
3. Connect first application (Wealth recommended) — guided conversation, not settings form
4. Schedule morning briefing (optional)
5. **Land on Today** — never on module list or desktop icon grid

---

## Multitasking navigation

- **Recents strip** on Home when apps open
- **Search** for any entity, app, or memory
- **"Jarvis, what was I doing?"** — resumes last context
- Max 2-3 open applications; primary + peek pattern (see workspace-model)
`,

  'workspace-model.md': `# BellasOS Workspace Model

How spatial layout, modes, and layers behave.

**Related:** [navigation-model](./navigation-model.md) | [experience-model](./experience-model.md)

---

## Default workspace

- **One primary surface:** Today OR one Application
- **Optional Jarvis companion panel** alongside application
- **Today always one gesture/command away**
- No chaotic multi-window desktop metaphor

The workspace feels like a single room that reconfigures — not a cluttered desk.

---

## Layer model

| Action | Behavior |
|--------|----------|
| **Open application** | Slides in; Today recedes but remains reachable |
| **Minimize** | Application state preserved; return to Today |
| **Close** | Application dismissed; context summarized to Working Memory |
| **Fullscreen** | Application only; Jarvis available via voice |
| **Split** | e.g. Research document + Jarvis thread side by side |
| **Peek** | Secondary app overlays ~30% (e.g. quote check while in Wealth) |

---

## Operating modes and workspace

| Mode | Workspace adaptation |
|------|---------------------|
| **Personal** | Minimal Today; life and environment items elevated |
| **Business** | Venture applications in recents; Harvi/TruAfrica prominent |
| **Wealth** | Numbers-forward cards; Wealth app uses full native chrome when open |
| **Research** | Wide reading layout; sources panel visible |
| **Intelligence** | Briefing timeline primary |
| **Focus** | Single application; notifications suppressed; Jarvis minimal |
| **Presentation** | Clean fullscreen; Jarvis silent unless addressed |
| **Developer** | Diagnostic overlays on same workspace — see below |

Mode switch via chip, voice, or Jarvis. Workspace animates subtly — not a hard page reload.

---

## Multitasking limits

- **Maximum 2-3 applications** in active workspace
- **One primary + one peek** recommended pattern
- Switch via Search, recents, or Jarvis
- Opening fourth app prompts: "Close something first?" or auto-minimize least recent

---

## Developer Mode workspace

Developer Mode is **goggles on the same OS** — not a separate product.

### Access

- Voice: "Developer mode"
- Configurable keyboard shortcut
- Hidden tap on version in settings

### Overlays (do not replace Home)

| Panel | Purpose |
|-------|---------|
| System diagnostics | Connections, health — technical detail expandable |
| Agent activity | What ran behind Jarvis (not user-facing agent names in normal UI) |
| Event timeline | Platform events for debugging |
| Memory inspector | Raw memory items and bindings |
| Routing trace | How Jarvis resolved last request |

Exit Developer Mode returns instantly to prior user workspace state.

Normal users never stumble into Developer Mode. Power users and builders live here when needed.
`,

  'intelligence-model.md': `# BellasOS Intelligence Model

How intelligence surfaces naturally without becoming noise.

**Related:** [notification-philosophy](./notification-philosophy.md) | [experience-model](./experience-model.md)

---

## Intelligence types

| Type | Description | Primary surface |
|------|-------------|-----------------|
| **Morning briefing** | Synthesized start-of-day | Today + optional Jarvis voice |
| **Alerts** | Threshold-triggered conditions | Today; notification if critical |
| **Research summaries** | Completed deep research | Conversation card + Research app |
| **Industry intelligence** | Sector and market monitoring | Briefing + Intelligence app |
| **Business intelligence** | Venture-scoped signals | Today items tagged to Harvi/TruAfrica |
| **Portfolio / wealth intelligence** | Holdings-relevant signals | Wealth context + briefing |
| **Trend detection** | Pattern across sources | "Pattern worth noting" card |
| **Opportunity detection** | Actionable openings | Linked to Goals when possible |

---

## Surfacing rules

1. **Today max 3 intelligence items** by default — rest in briefing or Intelligence app
2. **Non-urgent batched** into morning/evening briefing
3. **Relevance explained** — "This affects your BHP holding" not raw headline
4. **Snooze and mute** per topic always available
5. **User trains priorities** — "More mining, less general tech"

Intelligence **finds the user**. Users do not refresh dashboards to hunt it.

---

## Morning briefing structure

1. Overnight changes (wealth delta, venture updates)
2. Approvals waiting
3. Deadlines today and this week
4. Top intelligence (max 3 items)
5. Optional automation items due
6. One-line close: "What would you like to focus on?"

Delivered as: spoken summary (30-90s) + expandable Today cards.

---

## Alerts

- User configures thresholds per topic, sector, or holding
- **Critical** — notification + Today + optional voice
- **Standard** — Today only
- **Low** — batched into briefing

Alert copy links to impact: portfolio exposure, venture relevance, or past decision — not alarm for its own sake.

---

## Research summaries

- Appear when async research completes
- Card in active Jarvis thread + entry in Research application
- Linked to Topic for future intelligence
- Jarvis offers: summary, full report, "how does this affect X?"

---

## Trend and opportunity detection

Framed as **"Pattern worth noting"** — never alarmist.

Examples:
- "Three sources this week mention regulatory change in your tracked sector"
- "TruAfrica's market segment shows 20% growth — aligns with your Q3 goal"

Tied to Goals and Decisions when graph links exist.

---

## Anti-noise principles

- No connector sync success messages
- No background job completion toasts
- No low-confidence intel pushed to Today
- No duplicate intel across briefing, notification, and conversation
- Intelligence app holds depth; Today holds only what needs attention now
`,

  'notification-philosophy.md': `# BellasOS Notification Philosophy

Calm, low-noise notification system for 8+ hour daily use.

**Related:** [intelligence-model](./intelligence-model.md) | [operating-model/automation](../operating-model/automation.md)

---

## Philosophy

**Notifications earn their interrupt.**

Default state is calm. BellasOS batches, defers, and downgrades rather than ping repeatedly. The user trusts that if something appears, it matters.

---

## Deserves a notification

- Approval required (publish, venture write, significant financial log)
- Critical alert (user-defined threshold — security, major portfolio move)
- User-initiated research complete
- Automation failure affecting a user-visible scheduled action
- Calendar-driven meeting prep (future)

---

## Does not deserve a notification

- Connector or sync success
- Module or system health (Developer Mode only)
- Background briefing generated (appears silently on Today)
- Low-confidence intelligence
- Price refresh completion
- Routine automation success

---

## Priority levels

| Level | Channels | Persistence | Example |
|-------|----------|-------------|---------|
| **Critical** | Voice + visual + persist until acted | Until dismissed | Security-relevant alert |
| **Action** | Visual + optional voice | Until acted or snoozed | Approval waiting |
| **Info** | Today stack only | Until dismissed from Today | Briefing ready |
| **Silent** | None user-facing | N/A | Background sync |

---

## Actionable notifications

Every notification offers exactly one clear primary action:

- **Approve** / **Decline**
- **Open** (relevant application or card)
- **Snooze** (1 hour / tonight / tomorrow)
- **Dismiss**

No notification without a user path forward.

---

## Voice notifications

- Spoken only for **Critical** and **Action** when user enabled voice notifications
- Short spoken form: "Approval needed for LinkedIn draft" — not full post text
- Respects quiet hours and Focus mode
- User can disable voice notifications independently of voice conversation

---

## Anti-fatigue controls

| Control | Behavior |
|---------|----------|
| **Quiet hours** | No Critical/Action voice; Info deferred to Today |
| **Focus mode** | Suppress all non-Critical |
| **Daily budget** | User cap on Action notifications per day |
| **Jarvis batching** | "3 items need you" instead of 3 separate pings |
| **Snooze defaults** | Respect snooze until user re-enables topic |

---

## Approval workflows

Approvals are the most common Action notification:

1. Plain consequence stated
2. Primary: Approve
3. Secondary: Review, Snooze, Decline
4. On approve: optional decision memory capture for significant choices

Approvals never use technical language ("module action social.publish"). User sees: "Publish LinkedIn draft?"
`,

});

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(dir, name), content, 'utf8');
  console.log('wrote', name);
}

console.log('All product docs written.');

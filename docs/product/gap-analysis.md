# BellasOS UX and Product Gap Analysis

Compares the **current BellasOS implementation** against the **desired experience** defined in [docs/product](./README.md) and [docs/operating-model](../operating-model/README.md).

**Method:** Code and UI audit of `apps/web`, `apps/api`, `apps/worker`, and `libs/*` against product specifications. No architecture or vision redesign — the operating model and product model are assumed correct.

**Date:** June 2026

---

## Executive summary

The platform skeleton is **strong**: reactive Jarvis orchestration, module registry, Finance Tracker bridge, intelligence worker, voice STT/TTS, and approval infrastructure all exist and work.

The product surface is **immature**: home is a Jarvis shell with a module desktop and Command Center, not **Today**. The application registry exists in contracts but is **not wired** to UI or Jarvis routing. The workspace window model is **implemented in Zustand but never mounted**. Most operating-model specs (context stack, memory classes, proactive Jarvis, notification philosophy) remain **contracts and docs only**.

**Shortest path:** Re-skin and re-route existing capabilities in place — do not rebuild the platform.

---

## Summary matrix

| Area | Gap severity | Phase | Mismatch count |
|------|--------------|-------|----------------|
| Navigation | Critical | 1–2 | 6 |
| Home Experience | Critical | 1 | 5 |
| Jarvis Experience | Critical | 2 | 6 |
| Applications | Critical | 1–4 | 4 |
| Search | High | 3 | 3 |
| Notifications | High | 3 | 4 |
| Workspace | High | 2 | 4 |
| Intelligence | High | 1–3 | 3 |
| Memory | Medium | 4 | 3 |
| Voice | Medium | 4 | 3 |
| Gestures | Medium | 4 | 2 |
| Camera | Medium | 4 | 2 |
| Developer Mode | Medium | 1–4 | 2 |
| Finance Integration | High | 1–2 | 3 |
| External Application Integration | High | 4 | 3 |

---

## Cross-cutting themes

1. **Module vs application leakage** — UI exposes `bellasos.portfolio`, `bellasos.research`, and `/console?view=module:*` instead of named applications (Wealth, Research, etc.).
2. **Command Center as default power surface** — Desktop icon and taskbar route users to an admin console; product spec hides this from normal paths.
3. **Dead workspace code** — `shellStore.openApp`, `AppWindow`, and window state exist but apps navigate via full-page routes.
4. **Contracts not wired to runtime** — Application registry, context stack, memory classes, and Jarvis day phases are spec-only.
5. **Strong backend, weak product packaging** — Finance Tracker bridge and intelligence worker produce data; no Today surface aggregates it for the user.

---

## What is already aligned

- Reactive Jarvis chat with intent routing (`jarvis.controller.ts`, `jarvis-intent.ts`)
- Specialist agents behind orchestrator; user sees Jarvis only in normal flow
- Voice STT/TTS pipeline with local Whisper hybrid and TTS endpoints
- Finance Tracker HTTP bridge with read/write capabilities
- Intelligence module: briefings, alerts, sector monitoring; worker runs background jobs
- Approval infrastructure for flagged module actions (e.g. social publish)
- Gesture prototype with MediaPipe (pinch, point, swipe)
- Jarvis can open apps via `openApp` in chat responses

---

## Detailed mismatches

### Navigation

#### NAV-1: Default route is Jarvis shell, not Today

| Field | Detail |
|-------|--------|
| **Current State** | `/` renders `BellasShell` — particle orb, Jarvis transcript, desktop icon grid, taskbar (`apps/web/src/app/page.tsx`, `BellasShell.tsx`). |
| **Desired State** | First load is **Today** — prioritized stack, Jarvis presence, search entry, mode chip ([experience-model.md](./experience-model.md)). |
| **Gap** | No Today surface; home reads as ambient chat + app launcher. |
| **Recommended Change** | Replace desktop-as-home with `TodayView` on `/`; keep Jarvis presence below Today stack. |
| **Complexity** | L |
| **Impact** | Defines product identity on every session open. |
| **Priority** | P0 |

#### NAV-2: Module IDs exposed in desktop navigation

| Field | Detail |
|-------|--------|
| **Current State** | `Desktop.tsx` lists modules from `api.modules()` with labels like "Portfolio", "Research"; IDs are `bellasos.portfolio`, `bellasos.research`. Navigation map in `navigation.ts` is module-centric. |
| **Desired State** | User sees **Wealth**, **Research**, **Intelligence**, etc. — never module IDs or bridge names ([navigation-model.md](./navigation-model.md)). |
| **Gap** | Application naming layer missing; module registry drives UI. |
| **Recommended Change** | Wire `application-registry.json` into `apps/web/src/lib/applications.ts`; map modules to user-facing application names. |
| **Complexity** | M |
| **Impact** | Removes technical mental model from daily navigation. |
| **Priority** | P0 |

#### NAV-3: Command Center is a first-class desktop icon

| Field | Detail |
|-------|--------|
| **Current State** | `FIXED_APPS` in `Desktop.tsx` includes `system.console` → Command Center as primary desktop icon. Taskbar also links to console. |
| **Desired State** | Command Center concepts map to **Developer Mode only**; no parallel admin home ([navigation-model.md](./navigation-model.md)). |
| **Gap** | Admin surface competes with Today as default destination. |
| **Recommended Change** | Remove Command Center from desktop/taskbar; gate `/console` behind Developer Mode or settings. |
| **Complexity** | S |
| **Impact** | Stops power-user console from defining normal UX. |
| **Priority** | P0 |

#### NAV-4: Cross-app navigation via raw console routes

| Field | Detail |
|-------|--------|
| **Current State** | Apps open via `router.push` to `/console?view=module:bellasos.*` or `/finance` (`navigation.ts`, `useConsoleNavigation.ts`). |
| **Desired State** | Jarvis mediates transitions; applications do not link directly; user never sees `/console?view=module:*` ([navigation-model.md](./navigation-model.md)). |
| **Gap** | URL and routing model expose internal module structure. |
| **Recommended Change** | Application routes use `/app/wealth`, `/app/research` etc.; Jarvis and Search as primary navigators; console routes dev-only. |
| **Complexity** | L |
| **Impact** | Navigation feels like an OS, not an admin panel. |
| **Priority** | P1 |

#### NAV-5: No venture switching UX

| Field | Detail |
|-------|--------|
| **Current State** | No venture badge, no "For Harvi..." context switching, no Business mode chip. Context stack is contracts-only (`context.ts`). |
| **Desired State** | Venture badge on app chrome; switch via "For TruAfrica...", Business mode, or Search entity ([navigation-model.md](./navigation-model.md)). |
| **Gap** | Multi-venture workflow unsupported in UI. |
| **Recommended Change** | Minimal `ContextStack` service + mode/venture chip; Jarvis intent reads active venture. |
| **Complexity** | L |
| **Impact** | Enables business management workflows across Harvi and TruAfrica. |
| **Priority** | P1 |

#### NAV-6: First-run lands on shell, not Today

| Field | Detail |
|-------|--------|
| **Current State** | No onboarding flow; first load is Jarvis shell with default greeting. |
| **Desired State** | Onboarding → connect first app → **land on Today** — never module list ([navigation-model.md](./navigation-model.md)). |
| **Gap** | First impression is technical shell, not "my day." |
| **Recommended Change** | Short onboarding wizard ending on populated Today. |
| **Complexity** | M |
| **Impact** | Sets correct mental model for new users. |
| **Priority** | P2 |

---

### Home Experience

#### HOME-1: No Today stack

| Field | Detail |
|-------|--------|
| **Current State** | No prioritized item list; `DataIntelPanel` shows ingestion/search, not user commitments. |
| **Desired State** | Today stack with 5–7 prioritized items max; rest under "More" ([experience-model.md](./experience-model.md)). |
| **Gap** | User cannot see "what matters now" at a glance. |
| **Recommended Change** | `TodayView` + `GET /today` aggregating approvals, intel, wealth delta, venture items. |
| **Complexity** | L |
| **Impact** | Core home experience; defines daily operating rhythm. |
| **Priority** | P0 |

#### HOME-2: No mode chip

| Field | Detail |
|-------|--------|
| **Current State** | No Personal/Business/Wealth/Research/Focus indicator anywhere on home. |
| **Desired State** | Mode chip visible on home; switches workspace adaptation ([experience-model.md](./experience-model.md), [workspace-model.md](./workspace-model.md)). |
| **Gap** | Context is invisible; user cannot steer focus. |
| **Recommended Change** | Mode chip component wired to context stack state. |
| **Complexity** | M |
| **Impact** | Surfaces operating context without exposing domains. |
| **Priority** | P1 |

#### HOME-3: No universal search entry on home

| Field | Detail |
|-------|--------|
| **Current State** | No search bar or Cmd+K on home; only Jarvis text input. |
| **Desired State** | Universal search one keystroke or voice command away ([experience-model.md](./experience-model.md)). |
| **Gap** | Search is not a peer input path to voice/text. |
| **Recommended Change** | Omnibox in home header (Phase 3); placeholder chip in Phase 1. |
| **Complexity** | M |
| **Impact** | Primary interaction primitive missing from home. |
| **Priority** | P1 |

#### HOME-4: DataIntelPanel exposes admin affordances on home

| Field | Detail |
|-------|--------|
| **Current State** | `DataIntelPanel` on home: document ingest search, connector-style controls — admin tooling on primary surface. |
| **Desired State** | Hidden on home: ingestion controls, connector counts, system metrics ([experience-model.md](./experience-model.md)). |
| **Gap** | Home feels like operator console, not calm command center. |
| **Recommended Change** | Relocate to Intelligence app or Developer Mode; replace with user-facing intel cards on Today. |
| **Complexity** | S |
| **Impact** | Reduces cognitive load and admin anxiety on home. |
| **Priority** | P1 |

#### HOME-5: No connection status or open-apps strip

| Field | Detail |
|-------|--------|
| **Current State** | No "Connected" / "Working offline" indicator; no multitasking strip when apps open. |
| **Desired State** | Human-language connection status; open-apps strip only when multitasking ([experience-model.md](./experience-model.md)). |
| **Gap** | User lacks trust signals and multitasking awareness. |
| **Recommended Change** | Connection badge from app health APIs; open-apps strip from shellStore windows once workspace is wired. |
| **Complexity** | S |
| **Impact** | Subtle trust and orientation cues for 8+ hour use. |
| **Priority** | P2 |

---

### Jarvis Experience

#### JARVIS-1: Default greeting is passive, not proactive

| Field | Detail |
|-------|--------|
| **Current State** | Initial transcript: *"BellasOS online. Click the mic to start voice."* (`shellStore.ts`). |
| **Desired State** | Morning: one-sentence brief + populated Today; other times: silent readiness unless alert threshold ([experience-model.md](./experience-model.md), [jarvis-behavior.md](./jarvis-behavior.md)). |
| **Gap** | Jarvis waits for user; does not initiate daily flow. |
| **Recommended Change** | `GET /jarvis/arrival` on session open; populate greeting and Today from worker/API. |
| **Complexity** | M |
| **Impact** | Transforms Jarvis from chatbot to chief-of-staff. |
| **Priority** | P0 |

#### JARVIS-2: Day phases not implemented

| Field | Detail |
|-------|--------|
| **Current State** | `jarvis-behavior.ts` defines arrival → execution → intelligence → synthesis → background; no runtime implementation. |
| **Desired State** | Daily rhythm drives proactive behavior and Today composition ([daily-os-jarvis.md](../operating-model/daily-os-jarvis.md)). |
| **Gap** | Time-of-day behavior is static. |
| **Recommended Change** | Map day phase from clock + user config; adjust proactive rules in Jarvis controller. |
| **Complexity** | M |
| **Impact** | Natural daily arc: arrival → flow → closure. |
| **Priority** | P1 |

#### JARVIS-3: No approval UX in Jarvis thread

| Field | Detail |
|-------|--------|
| **Current State** | Approvals API exists (`GET /approvals`, `POST /approvals/:id/resolve`); no inline cards in Jarvis UI. |
| **Desired State** | Plain consequence; one primary action; link to decision memory on confirm ([jarvis-behavior.md](./jarvis-behavior.md)). |
| **Gap** | User must leave Jarvis flow to act on approvals. |
| **Recommended Change** | Approval cards in Jarvis transcript with Approve/Decline actions. |
| **Complexity** | M |
| **Impact** | Completes action loop without admin navigation. |
| **Priority** | P1 |

#### JARVIS-4: AgentsView bypasses Jarvis persona

| Field | Detail |
|-------|--------|
| **Current State** | Command Center `AgentsView` allows direct agent prompts; visible in normal navigation path via console. |
| **Desired State** | Specialists invisible; only Jarvis speaks ([jarvis-behavior.md](./jarvis-behavior.md), [agents.md](../operating-model/agents.md)). |
| **Gap** | Power users see agent machinery; breaks single-voice model. |
| **Recommended Change** | Move AgentsView to Developer Mode overlay only. |
| **Complexity** | S |
| **Impact** | Preserves Jarvis as sole user-facing intelligence. |
| **Priority** | P1 |

#### JARVIS-5: No "Back to Today" or close-app context summary

| Field | Detail |
|-------|--------|
| **Current State** | Closing app navigates away; no Working Memory summary on dismiss. |
| **Desired State** | "Back to Today" / swipe up; close app → context summarized to Working Memory ([workspace-model.md](./workspace-model.md)). |
| **Gap** | Context lost on navigation; no home return ritual. |
| **Recommended Change** | Close handler writes session summary via memory API; voice/gesture "Back to Today." |
| **Complexity** | M |
| **Impact** | Continuous context across app sessions. |
| **Priority** | P1 |

#### JARVIS-6: Application open uses hardcoded module map

| Field | Detail |
|-------|--------|
| **Current State** | `APP_TO_CONSOLE_VIEW` and `jarvis-intent.ts` use hardcoded module IDs; not `getCapability()` from application registry. |
| **Desired State** | Jarvis routes via application registry; never opens module panels for normal tasks ([jarvis-behavior.md](./jarvis-behavior.md)). |
| **Gap** | Jarvis and UI diverge from canonical application catalog. |
| **Recommended Change** | Jarvis intent resolver calls `application-registry.ts` for capability → module/action mapping. |
| **Complexity** | M |
| **Impact** | Single source of truth for app launching. |
| **Priority** | P1 |

---

### Applications

#### APP-1: No unified Wealth application

| Field | Detail |
|-------|--------|
| **Current State** | Three surfaces: Portfolio desktop icon → `/finance` iframe; Portfolio panel in Console; hidden `bellasos.finance` module. User sees "Portfolio", not "Wealth." |
| **Desired State** | **Wealth** — one named app combining Finance Tracker + portfolio view ([navigation-model.md](./navigation-model.md)). |
| **Gap** | Finance fragmented; technical names leak. |
| **Recommended Change** | Single Wealth application entry; internal routing to iframe + portfolio summary; user-facing label "Wealth" everywhere. |
| **Complexity** | M |
| **Impact** | Finance reviews become conversational-first with optional depth. |
| **Priority** | P0 |

#### APP-2: Harvi and TruAfrica not implemented

| Field | Detail |
|-------|--------|
| **Current State** | Registry entries with env vars only; no bridge modules, no UI, no Jarvis routing. |
| **Desired State** | Named venture apps; Jarvis live queries with attribution ([navigation-model.md](./navigation-model.md), [external-systems.md](../operating-model/external-systems.md)). |
| **Gap** | Core business ventures unreachable. |
| **Recommended Change** | Thin bridge modules mirroring `finance-tracker` pattern; venture apps in launcher. |
| **Complexity** | XL |
| **Impact** | Enables business management workflows. |
| **Priority** | P1 |

#### APP-3: Native apps render as Command Center module panels

| Field | Detail |
|-------|--------|
| **Current State** | Research, Intelligence, etc. open as `?view=module:bellasos.*` full-page console with admin-style panels (`modulePanels.tsx`). |
| **Desired State** | Applications layer into workspace; Jarvis companion optional; not admin panels ([experience-model.md](./experience-model.md)). |
| **Gap** | Depth surfaces feel like configuration UI, not applications. |
| **Recommended Change** | Application chrome wrapping existing panels; slide-in layer over Today. |
| **Complexity** | L |
| **Impact** | Applications feel like depth, not admin. |
| **Priority** | P1 |

#### APP-4: Communications labeled "Social Media"

| Field | Detail |
|-------|--------|
| **Current State** | `APP_TITLES['bellasos.social']` = "Social Media". |
| **Desired State** | **Communications** — drafts, schedule, publish pipeline ([navigation-model.md](./navigation-model.md)). |
| **Gap** | Wrong mental model and naming. |
| **Recommended Change** | Rename in application registry mapping and `APP_TITLES`. |
| **Complexity** | S |
| **Impact** | Aligns label with product vocabulary. |
| **Priority** | P2 |

---

### Search

#### SEARCH-1: No global omnibox

| Field | Detail |
|-------|--------|
| **Current State** | No Cmd+K, no global search component. |
| **Desired State** | Omnibox on Home; shortcut; voice "Search" ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Search is not a first-class interaction primitive. |
| **Recommended Change** | `UniversalSearch` component with scoped queries. |
| **Complexity** | L |
| **Impact** | Fast retrieval across apps, memory, research. |
| **Priority** | P1 |

#### SEARCH-2: Ingest search only, not cross-entity

| Field | Detail |
|-------|--------|
| **Current State** | `DataIntelPanel` calls `api.ingestSearch()` — ingestion documents only. |
| **Desired State** | Scopes: Global, Entity, Application, Memory, Research, Intelligence ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Search limited to one backend; no unified retrieval. |
| **Recommended Change** | Search aggregator API fan-out to memory, reports, briefings, registry apps. |
| **Complexity** | L |
| **Impact** | "One keystroke away" from anything. |
| **Priority** | P1 |

#### SEARCH-3: No Search-vs-Jarvis handoff

| Field | Detail |
|-------|--------|
| **Current State** | Jarvis chat and ingest search are separate; no "Tell me more about this" pattern. |
| **Desired State** | Search retrieves; Jarvis reasons and acts; explicit handoff ([interaction-model.md](./interaction-model.md)). |
| **Gap** | No bridge from retrieval to conversation. |
| **Recommended Change** | Search result actions: "Ask Jarvis" pre-fills context stack. |
| **Complexity** | M |
| **Impact** | Search and conversation feel unified. |
| **Priority** | P2 |

---

### Notifications

#### NOTIFY-1: Notifications only in Security view, read-only

| Field | Detail |
|-------|--------|
| **Current State** | `SecurityView` lists notifications via `api.notifications()`; copy says read-only until mark-read API added. |
| **Desired State** | Today-integrated; actionable; not buried in security admin ([notification-philosophy.md](./notification-philosophy.md)). |
| **Gap** | Notifications invisible in daily flow. |
| **Recommended Change** | Surface Action/Critical on Today; add mark-read/snooze/dismiss APIs. |
| **Complexity** | M |
| **Impact** | User sees what needs attention without hunting. |
| **Priority** | P1 |

#### NOTIFY-2: Wrong priority model

| Field | Detail |
|-------|--------|
| **Current State** | `NotificationLevel`: info/success/warning/error — not product Critical/Action/Info/Silent. |
| **Desired State** | Four levels with channel rules ([notification-philosophy.md](./notification-philosophy.md)). |
| **Gap** | Cannot enforce calm notification budget. |
| **Recommended Change** | Extend notification schema with `priority` and `channels`; map worker jobs to levels. |
| **Complexity** | M |
| **Impact** | Notifications earn interrupt. |
| **Priority** | P1 |

#### NOTIFY-3: Background briefings may notify instead of silent Today

| Field | Detail |
|-------|--------|
| **Current State** | Worker creates notifications for intelligence alerts; briefing ready behavior not aligned to Today-only Info level. |
| **Desired State** | Background briefing → Today silently; no toast ([notification-philosophy.md](./notification-philosophy.md)). |
| **Gap** | Noise from background intelligence. |
| **Recommended Change** | Worker writes to Today feed; Info-level skips notification channel. |
| **Complexity** | S |
| **Impact** | Calm default; intelligence finds user. |
| **Priority** | P1 |

#### NOTIFY-4: No actionable notification actions

| Field | Detail |
|-------|--------|
| **Current State** | List display only; no Approve/Open/Snooze/Dismiss. |
| **Desired State** | Every notification offers one clear primary action ([notification-philosophy.md](./notification-philosophy.md)). |
| **Gap** | Notifications are informational dead ends. |
| **Recommended Change** | Action buttons wired to approvals, app open, snooze store. |
| **Complexity** | M |
| **Impact** | Completes notification → action loop. |
| **Priority** | P1 |

---

### Workspace

#### WORK-1: AppWindow never mounted — dead code

| Field | Detail |
|-------|--------|
| **Current State** | `shellStore.openApp`, `windows[]`, `AppWindow.tsx` exist; `AppWindow` imported nowhere except its own file. |
| **Desired State** | Open app → slide in; Today recedes ([workspace-model.md](./workspace-model.md)). |
| **Gap** | Layer model designed but not rendered. |
| **Recommended Change** | Mount `AppWindow` in `BellasShell`; wire `openApp` from nav and Jarvis. |
| **Complexity** | L |
| **Impact** | OS-like spatial behavior without route churn. |
| **Priority** | P0 |

#### WORK-2: Full-page route navigation

| Field | Detail |
|-------|--------|
| **Current State** | `navigateToApp` → `router.push` to `/console` or `/finance`; leaves shell entirely. |
| **Desired State** | Single primary surface (Today OR one Application); Today one gesture away. |
| **Gap** | Each app open is a page transition, not a layer. |
| **Recommended Change** | In-shell app container for native apps; iframe apps stay full-route initially. |
| **Complexity** | L |
| **Impact** | Continuous Jarvis presence during app use. |
| **Priority** | P0 |

#### WORK-3: No minimize, peek, split, or state restore

| Field | Detail |
|-------|--------|
| **Current State** | No peek overlay, split view, or scroll/focus restore on return. |
| **Desired State** | Minimize → Today; peek 30%; split Research + Jarvis; restore state ([workspace-model.md](./workspace-model.md)). |
| **Gap** | Multitasking patterns missing. |
| **Recommended Change** | Implement peek and minimize using existing window store; persist app state in session. |
| **Complexity** | L |
| **Impact** | Power multitasking without desktop chaos. |
| **Priority** | P2 |

#### WORK-4: No operating-mode workspace behaviors

| Field | Detail |
|-------|--------|
| **Current State** | No Focus mode suppression, Presentation fullscreen, or mode-driven layout. |
| **Desired State** | Focus suppresses notifications; Presentation silences Jarvis; Research uses wide layout ([workspace-model.md](./workspace-model.md)). |
| **Gap** | Modes are spec-only. |
| **Recommended Change** | Mode-driven CSS layout + notification gate in context service. |
| **Complexity** | M |
| **Impact** | Focus sacred; mode switch feels purposeful. |
| **Priority** | P2 |

---

### Intelligence

#### INTEL-1: Admin-style intel panel on home, not Today cards

| Field | Detail |
|-------|--------|
| **Current State** | `DataIntelPanel` on home — ingestion/search UI, not user intel cards. |
| **Desired State** | Max 3 intel items on Today with relevance explanation ([intelligence-model.md](./intelligence-model.md)). |
| **Gap** | Intelligence surfaced as admin tooling. |
| **Recommended Change** | Today intel cards from worker/API; cap at 3 with "More in Intelligence." |
| **Complexity** | M |
| **Impact** | Intelligence arrives without noise. |
| **Priority** | P1 |

#### INTEL-2: Morning briefing not composed for user

| Field | Detail |
|-------|--------|
| **Current State** | Worker generates daily briefing; no structured composition (overnight → approvals → ventures → wealth → intel). |
| **Desired State** | 30–90 second spoken + expandable cards; structured sections ([intelligence-model.md](./intelligence-model.md)). |
| **Gap** | Briefing exists but not product-shaped. |
| **Recommended Change** | Briefing composer API assembling sections from existing data sources. |
| **Complexity** | M |
| **Impact** | Morning ritual matches product spec. |
| **Priority** | P1 |

#### INTEL-3: No snooze/mute per topic

| Field | Detail |
|-------|--------|
| **Current State** | Alert rules in intelligence module; no user snooze/mute UI. |
| **Desired State** | Snooze/mute per topic; relevance explained ([intelligence-model.md](./intelligence-model.md)). |
| **Gap** | User cannot control intel noise. |
| **Recommended Change** | Snooze/mute actions on Today intel cards; persist preferences. |
| **Complexity** | M |
| **Impact** | Anti-fatigue for long sessions. |
| **Priority** | P2 |

---

### Memory

#### MEM-1: Memory classes not persisted

| Field | Detail |
|-------|--------|
| **Current State** | Three storage tiers (short/working/long) work; `memoryClass` from contracts never written to DB. |
| **Desired State** | 8 semantic classes with promotion/forgetting rules ([memory.md](../operating-model/memory.md)). |
| **Gap** | Memory is blob storage, not structured knowledge. |
| **Recommended Change** | Persist `memoryClass` on write; promotion on "remember this." |
| **Complexity** | M |
| **Impact** | Enables intelligent recall and personalization. |
| **Priority** | P2 |

#### MEM-2: No user-facing memory categories

| Field | Detail |
|-------|--------|
| **Current State** | No UI for Preferences, Decisions, People, Instructions, Topics. |
| **Desired State** | Plain-language categories; not memory tiers ([experience-model.md](./experience-model.md)). |
| **Gap** | User cannot browse or trust what Jarvis remembers. |
| **Recommended Change** | Memory browser mapping classes to user categories. |
| **Complexity** | L |
| **Impact** | Memory transparent; builds trust. |
| **Priority** | P2 |

#### MEM-3: No edit, forget, or monthly review UX

| Field | Detail |
|-------|--------|
| **Current State** | REST remember/recall only; no browser, edit, or forget UI. |
| **Desired State** | Edit, forget, optional monthly review ([experience-model.md](./experience-model.md)). |
| **Gap** | User cannot correct or audit memory. |
| **Recommended Change** | Memory app depth surface + Jarvis "forget that" wired to delete. |
| **Complexity** | M |
| **Impact** | Trust and correction without surveillance framing. |
| **Priority** | P3 |

---

### Voice

#### VOICE-1: No ambient wake-word mode

| Field | Detail |
|-------|--------|
| **Current State** | Push-to-talk via mic button and taskbar toggle; no wake word. |
| **Desired State** | Ambient mode with wake word for home/office opt-in ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Voice requires explicit activation always. |
| **Recommended Change** | Wake-word setting (opt-in); visible listening indicator. |
| **Complexity** | L |
| **Impact** | Hands-free Jarvis in trusted environments. |
| **Priority** | P3 |

#### VOICE-2: Voice modes not integrated

| Field | Detail |
|-------|--------|
| **Current State** | Single mic toggle; separate `VoicePanel` test UI in Console. |
| **Desired State** | Ambient, push-to-talk, conversation, command, dictation modes ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Mode table from product spec not reflected. |
| **Recommended Change** | Voice mode setting; unify Console test UI into settings. |
| **Complexity** | M |
| **Impact** | Voice adapts to context (office vs home). |
| **Priority** | P3 |

#### VOICE-3: Live captions and Stop semantics incomplete

| Field | Detail |
|-------|--------|
| **Current State** | Partial captions via `heardCaption`; TTS skippable inconsistently. |
| **Desired State** | Live captions always; TTS skippable; "Stop" universal ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Voice feedback not fully accessible or controllable. |
| **Recommended Change** | Persistent caption bar; universal Stop gesture/voice/command. |
| **Complexity** | S |
| **Impact** | Voice usable in open office and accessibility. |
| **Priority** | P2 |

---

### Gestures

#### GEST-1: Partial gesture vocabulary

| Field | Detail |
|-------|--------|
| **Current State** | `GestureLayer`: pinch, point, swipe only. Point activates voice + camera ingest. |
| **Desired State** | Full vocabulary: open palm → Jarvis, swipe up → Today, circle → search, fist → cancel, etc. ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Most product gestures unimplemented. |
| **Recommended Change** | Extend MediaPipe classifier; map gestures to navigation actions. |
| **Complexity** | L |
| **Impact** | Optional hands-free navigation. |
| **Priority** | P3 |

#### GEST-2: Gestures not mapped to workspace navigation

| Field | Detail |
|-------|--------|
| **Current State** | Gestures trigger voice listen and camera event only. |
| **Desired State** | Swipe up → Today; swipe down → dismiss; never required ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Gestures don't support spatial model. |
| **Recommended Change** | Wire swipe up/down to shellStore navigation once workspace live. |
| **Complexity** | M |
| **Impact** | Gesture layer complements voice/search. |
| **Priority** | P3 |

---

### Camera

#### CAM-1: No presence/attention-driven behavior

| Field | Detail |
|-------|--------|
| **Current State** | Camera module ingests events; Console `CameraPanel` for stream URL and test ingest; no briefing pause. |
| **Desired State** | Presence pauses/resumes briefing; attention pauses TTS when away ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Camera is admin ingest, not ambient awareness. |
| **Recommended Change** | Presence hooks in voice session; pause TTS on away detection. |
| **Complexity** | L |
| **Impact** | Natural conversation flow. |
| **Priority** | P3 |

#### CAM-2: Privacy model not in first-run UX

| Field | Detail |
|-------|--------|
| **Current State** | Gesture layer enables webcam on taskbar toggle; no first-run privacy tutorial. |
| **Desired State** | Off by default; indicator when on; no stored video unless explicit; one-click disable ([interaction-model.md](./interaction-model.md)). |
| **Gap** | Camera enable is abrupt; privacy promise not surfaced. |
| **Recommended Change** | Privacy modal on first enable; persistent indicator; default off. |
| **Complexity** | S |
| **Impact** | Trust for camera/gesture features. |
| **Priority** | P2 |

---

### Developer Mode

#### DEV-1: No Developer Mode overlay

| Field | Detail |
|-------|--------|
| **Current State** | Command Center is permanent admin surface with module enable/disable, agents, audit, system health. |
| **Desired State** | Developer Mode = goggles overlay; voice/shortcut/version tap; never replaces Home ([workspace-model.md](./workspace-model.md)). |
| **Gap** | Admin console defines product for power users. |
| **Recommended Change** | `DeveloperOverlay` component; move Command Center content behind gate. |
| **Complexity** | L |
| **Impact** | Separates daily use from platform operations. |
| **Priority** | P1 |

#### DEV-2: JSON invoke not behind dev gate

| Field | Detail |
|-------|--------|
| **Current State** | `ModuleActionsPanel` exposes "Developer JSON invoke" per module in normal Console path. |
| **Desired State** | Routing trace, memory inspector, agent log behind Developer Mode only. |
| **Gap** | Raw invoke accessible in normal navigation. |
| **Recommended Change** | Collapse invoke into Developer overlay panels. |
| **Complexity** | S |
| **Impact** | Hides machine from normal users. |
| **Priority** | P2 |

---

### Finance Integration

#### FIN-1: Three fragmented finance surfaces

| Field | Detail |
|-------|--------|
| **Current State** | Finance Tracker iframe (`/finance`), Portfolio Console panel, hidden Finance module — three entry points. |
| **Desired State** | Unified **Wealth** app; conversational net worth first ([experience-model.md](./experience-model.md)). |
| **Gap** | User must know internal fragmentation. |
| **Recommended Change** | Wealth app shell routing to iframe + summary; single launcher entry. |
| **Complexity** | M |
| **Impact** | Finance reviews start in conversation. |
| **Priority** | P0 |

#### FIN-2: Conversational net worth not default

| Field | Detail |
|-------|--------|
| **Current State** | Net worth requires opening Portfolio panel or Finance iframe; Jarvis can query via FinanceAgent but no Today card. |
| **Desired State** | Conversational net worth first; Wealth app optional for depth ([experience-model.md](./experience-model.md)). |
| **Gap** | Visual exploration required for basic wealth check. |
| **Recommended Change** | Today wealth snippet + Jarvis inline cards from `wealth.summary.get`. |
| **Complexity** | M |
| **Impact** | Wealth check in seconds via Jarvis. |
| **Priority** | P1 |

#### FIN-3: Registry approval levels not enforced on writes

| Field | Detail |
|-------|--------|
| **Current State** | Registry marks finance writes as `approval: confirm`; FinanceAgent/module actions lack `requiresApproval`. |
| **Desired State** | Write actions execute after confirmation; Jarvis reports outcome ([jarvis-behavior.md](./jarvis-behavior.md)). |
| **Gap** | Financial writes may execute without confirm flow. |
| **Recommended Change** | Map registry `approval` to module `requiresApproval` or Jarvis confirm card. |
| **Complexity** | M |
| **Impact** | Safety for financial mutations. |
| **Priority** | P1 |

---

### External Application Integration

#### EXT-1: Finance Tracker — strong bridge, weak packaging

| Field | Detail |
|-------|--------|
| **Current State** | `libs/modules/finance-tracker` fully implemented; capabilities mapped in registry; UI splits across iframe and panels. |
| **Desired State** | Live query with attribution; unified Wealth experience ([external-systems.md](../operating-model/external-systems.md)). |
| **Gap** | Backend ready; product layer missing. |
| **Recommended Change** | Phase 1 Wealth packaging; Jarvis attribution string on live queries. |
| **Complexity** | M |
| **Impact** | Best ROI — reuse existing bridge. |
| **Priority** | P0 |

#### EXT-2: Harvi / TruAfrica — no client modules

| Field | Detail |
|-------|--------|
| **Current State** | Registry entries with `HARVI_URL`, `TRUAFRICA_URL` env vars; no HTTP clients, no Jarvis capability routing. |
| **Desired State** | Live venture queries; venture-scoped apps; write with approval ([external-systems.md](../operating-model/external-systems.md)). |
| **Gap** | Ventures unreachable despite registry spec. |
| **Recommended Change** | Bridge modules following finance-tracker pattern; wire capabilities to Jarvis. |
| **Complexity** | XL |
| **Impact** | Business operations in BellasOS. |
| **Priority** | P1 |

#### EXT-3: Source attribution inconsistent in Jarvis

| Field | Detail |
|-------|--------|
| **Current State** | Jarvis responses vary; no consistent "From Finance Tracker, as of today..." pattern. |
| **Desired State** | Attribution when sourcing matters for trust ([jarvis-behavior.md](./jarvis-behavior.md)). |
| **Gap** | User cannot verify data freshness/source. |
| **Recommended Change** | Response template in Jarvis controller for external system citations. |
| **Complexity** | S |
| **Impact** | Trust in federated answers. |
| **Priority** | P2 |

---

## Priority rollup

| Priority | Count | Focus |
|----------|-------|-------|
| **P0** | 8 | Today home, Wealth app, workspace layers, application naming, demote Command Center |
| **P1** | 22 | Jarvis proactive flow, search, notifications, intelligence surfacing, venture bridges, approvals |
| **P2** | 11 | Memory browser, gesture polish, snooze/mute, dev gate, attribution |
| **P3** | 6 | Wake word, voice modes, advanced gestures, camera presence |

---

## Related documents

- [migration-roadmap.md](./migration-roadmap.md) — phased implementation plan
- [experience-model.md](./experience-model.md) — target experience entry point
- [operating-model](../operating-model/README.md) — structural source of truth

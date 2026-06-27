# BellasOS Product Migration Roadmap

Phased plan to transform the **current BellasOS implementation** into the **desired experience** defined in [docs/product](./README.md).

**Principle:** Re-skin and re-route existing capabilities — do not rebuild the platform. The operating model and architecture stay as-is.

**Gap reference:** [gap-analysis.md](./gap-analysis.md)

---

## Overview

| Phase | Theme | Resolves gaps | Est. effort |
|-------|-------|---------------|-------------|
| **1** | Today Home and Application Layer | NAV-1–3, HOME-1, APP-1/4, FIN-1, EXT-1, INTEL-1 partial | 2–3 weeks |
| **2** | Jarvis, Workspace, Navigation | WORK-1/2, JARVIS-1–6, NAV-4/5, APP-3, FIN-2/3, DEV-1 partial | 3–4 weeks |
| **3** | Search, Notifications, Intelligence | SEARCH-1–3, NOTIFY-1–4, INTEL-1–3, HOME-3/4 | 2–3 weeks |
| **4** | Memory, Ventures, Developer Mode, Input Polish | MEM-1–3, APP-2, EXT-2/3, DEV-1/2, VOICE/GEST/CAM | 4–6 weeks |

---

## Phase 1 — Today Home and Application Layer

**Resolves:** P0 identity gaps — home is not Today; modules exposed; Command Center prominent; Wealth fragmented.

### Objectives

1. Replace module-desktop home with **Today** as the default surface on `/`.
2. Introduce an **application naming layer** wired to `application-registry.json`.
3. Package finance as unified **Wealth** — single user-facing entry.
4. **Demote Command Center** from desktop/taskbar to hidden/developer path.
5. Aggregate existing backend data into a Today feed API.

### Deliverables

| Deliverable | Description | Gap IDs |
|-------------|-------------|---------|
| `TodayView` component | Prioritized stack (5–7 items), Jarvis presence, placeholder search chip, connection badge | HOME-1, NAV-1 |
| `GET /today` API | Aggregates: pending approvals, action notifications, intel highlights (max 3), wealth delta snippet, automation items | HOME-1, INTEL-1 partial |
| Application launcher | Replace module-centric `Desktop` with registry-driven app grid using user names (Wealth, Research, etc.) | NAV-2, APP-1, APP-4 |
| Wealth application shell | Single "Wealth" entry routing to Finance Tracker iframe + portfolio summary card | APP-1, FIN-1, EXT-1 |
| Command Center demotion | Remove `system.console` from desktop; keep `/console` route for dev access | NAV-3, DEV-1 partial |
| Rename Communications | `bellasos.social` → "Communications" in all user-facing labels | APP-4 |

### Files likely affected

**New files:**
- `apps/web/src/components/today/TodayView.tsx`
- `apps/web/src/components/today/TodayItem.tsx`
- `apps/web/src/lib/applications.ts` — maps registry → UI labels, icons, routes
- `apps/api/src/today.controller.ts` — aggregation endpoint

**Modified files:**
- `apps/web/src/app/page.tsx` — compose Today + Jarvis, not desktop grid
- `apps/web/src/components/shell/BellasShell.tsx` — layout: Today primary, Jarvis below
- `apps/web/src/components/shell/Desktop.tsx` — replace or remove from home
- `apps/web/src/lib/navigation.ts` — application-centric routes
- `apps/web/src/components/shell/Taskbar.tsx` — remove Command Center shortcut
- `libs/shared/contracts/src/operating-model/application-registry.ts` — export helpers for web

### Dependencies

- Existing APIs: `GET /approvals`, `GET /notifications`, intelligence briefings, portfolio summary, Finance Tracker `summary.get`
- Application registry JSON (already canonical)
- No new architecture required

### Risks

| Risk | Mitigation |
|------|------------|
| Today aggregation slow (multiple API calls) | Parallel fetch with stale-while-revalidate; cache Today for 60s |
| Wealth iframe still full-page initially | Acceptable for Phase 1; layer model in Phase 2 |
| Users accustomed to desktop icons | Brief "What's new" on first load after upgrade |

### Exit criteria

- User opens BellasOS and sees Today stack, not desktop icons
- "Wealth" is the only finance entry in launcher
- Command Center not reachable from home without knowing URL
- Today shows at least: approvals, one wealth snippet, up to 3 intel items

---

## Phase 2 — Jarvis, Workspace, and Navigation

**Resolves:** P0–P1 flow gaps — workspace dead code, passive Jarvis, no context, registry not wired.

### Objectives

1. Make Jarvis **proactive on arrival** — morning brief populates Today and greeting.
2. **Mount workspace layer model** — apps slide in over Today; Jarvis stays present.
3. Wire **application registry** into Jarvis routing (replace hardcoded module map).
4. Add **context stack** (mode + venture + focus) with mode chip.
5. Inline **approval cards** in Jarvis thread.
6. Restrict **AgentsView** and raw console paths to developer access.

### Deliverables

| Deliverable | Description | Gap IDs |
|-------------|-------------|---------|
| `GET /jarvis/arrival` | Proactive greeting + Today seed based on day phase and time | JARVIS-1, JARVIS-2 |
| Workspace layers | Mount `AppWindow`; wire `shellStore.openApp`; Today recedes on app open | WORK-1, WORK-2 |
| Back to Today | Voice command, gesture (swipe up in Phase 4), close button | JARVIS-5, NAV-4 |
| Close → Working Memory | App close writes session summary to working memory tier | JARVIS-5 |
| Registry Jarvis routing | Intent resolver uses `getCapability()` from application registry | JARVIS-6 |
| Approval cards in Jarvis | Inline Approve/Decline in transcript | JARVIS-3 |
| Context stack service | Minimal: operating mode, active venture, focus entity | NAV-5, HOME-2, WORK-4 partial |
| Mode chip UI | Personal / Business / Wealth / Research / Focus selector | HOME-2 |
| Application chrome | Wrap module panels in application shell (not raw console) | APP-3, NAV-4 |
| AgentsView gated | Move to Developer Mode path only | JARVIS-4 |
| Wealth Today snippet | Conversational net worth card on Today from live FT query | FIN-2 |
| Finance write confirm | Map registry `approval: confirm` to Jarvis confirm cards | FIN-3 |

### Files likely affected

**New files:**
- `libs/core/context/src/index.ts` — ContextStack service (mode, venture, focus)
- `apps/web/src/components/applications/ApplicationShell.tsx` — chrome wrapper for depth apps
- `apps/web/src/components/jarvis/ApprovalCard.tsx`

**Modified files:**
- `apps/web/src/stores/shellStore.ts` — wire openApp to UI
- `apps/web/src/components/shell/AppWindow.tsx` — mount in BellasShell
- `apps/web/src/components/shell/AppContent.tsx` — render app content in window
- `apps/web/src/components/shell/BellasShell.tsx` — window layer + Today underneath
- `apps/web/src/hooks/useConsoleNavigation.ts` — use openApp for native apps, router for iframe
- `apps/api/src/jarvis.controller.ts` — arrival endpoint, registry routing
- `apps/api/src/jarvis-intent.ts` — consume application registry
- `apps/web/src/components/CommandCenter.tsx` — dev gate or redirect
- `apps/web/src/components/views.tsx` — AgentsView access restriction
- `libs/agents/pool/src/additional-agents.ts` — FinanceAgent confirm flow

### Dependencies

- **Phase 1 complete** — Today surface and application naming must exist
- Existing approval API and memory remember/recall APIs
- Application registry helpers from Phase 1

### Risks

| Risk | Mitigation |
|------|------------|
| iframe apps (Finance Tracker) don't fit window model | Keep iframe as full-route; native apps use layers first |
| Context stack scope creep | Ship minimal 3-field stack; expand later |
| Jarvis routing regression | Feature flag registry routing; fallback to current intent map |

### Exit criteria

- Morning open shows proactive Jarvis line and populated Today
- Research/Intelligence open as layered apps over Today, not full console page
- Jarvis opens Wealth via registry, not hardcoded module ID
- Approvals actionable in Jarvis thread
- Mode chip switches context; Focus suppresses non-critical items

---

## Phase 3 — Search, Notifications, and Intelligence Surfacing

**Resolves:** P1 calm UX gaps — no search, wrong notifications, intel as admin panel.

### Objectives

1. Ship **universal search** omnibox with scoped retrieval.
2. Enforce **notification philosophy** — priority levels, Today-only Info, actionable notifications.
3. Surface **intelligence on Today** with relevance lines; remove admin intel from home.
4. Compose **structured morning briefing** from existing worker output.

### Deliverables

| Deliverable | Description | Gap IDs |
|-------------|-------------|---------|
| Universal search omnibox | Cmd+K + home search bar; scopes: Global, Entity, App, Memory, Research, Intelligence | SEARCH-1, HOME-3 |
| Search aggregator API | Fan-out to memory recall, research reports, briefings, app registry | SEARCH-2 |
| Search → Jarvis handoff | "Ask Jarvis about this" on search results | SEARCH-3 |
| Notification priority model | Critical / Action / Info / Silent with channel rules | NOTIFY-2 |
| Persisted notifications | Postgres primary; mark-read, snooze, dismiss APIs | NOTIFY-1 |
| Actionable notifications | Approve / Open / Snooze / Dismiss on every notification | NOTIFY-4 |
| Worker notification alignment | Briefing ready → Today silently; critical alerts → notification | NOTIFY-3 |
| Today intel cards | Max 3 with relevance line ("Affects your X holding") | INTEL-1 |
| Briefing composer | Structured sections: overnight → approvals → ventures → wealth → intel | INTEL-2 |
| Relocate DataIntelPanel | Move to Intelligence app or Developer Mode | HOME-4 |
| Snooze/mute on intel | Per-topic controls on Today cards | INTEL-3 |

### Files likely affected

**New files:**
- `apps/web/src/components/search/UniversalSearch.tsx`
- `apps/web/src/components/search/SearchResults.tsx`
- `apps/web/src/components/today/IntelCard.tsx`
- `apps/web/src/components/notifications/NotificationActions.tsx`
- `apps/api/src/search.controller.ts`
- `apps/api/src/briefing.controller.ts`

**Modified files:**
- `libs/core/notifications/src/index.ts` — priority field, DB-backed list, mark-read
- `apps/api/src/controllers.ts` — notification CRUD extensions
- `apps/worker/src/main.ts` — Today feed writes vs notification creates
- `apps/web/src/components/shell/DataIntelPanel.tsx` — remove from home or relocate
- `apps/web/src/components/shell/BellasShell.tsx` — search omnibox in header
- `apps/web/src/components/views.tsx` — upgrade SecurityView notifications or deprecate
- `libs/shared/contracts` — extend notification type with priority (minimal)

### Dependencies

- **Phase 1** — Today stack to receive intel and Info-level items
- **Phase 2** — Focus mode for notification suppression; context for scoped search

### Risks

| Risk | Mitigation |
|------|------------|
| Search indexing scope creep | Start with existing API fan-out; defer full-text graph index |
| Notification migration | Backfill priority on existing rows as Info |
| Briefing composer latency | Pre-compute in worker; serve cached composition |

### Exit criteria

- Cmd+K search returns results from memory, research, apps, and briefings
- Background briefing appears on Today without toast notification
- Critical/Action notifications have Approve/Open/Snooze/Dismiss
- Home has no admin ingest panel
- Morning briefing follows structured section order

---

## Phase 4 — Memory, Ventures, Developer Mode, Input Polish

**Resolves:** P2–P3 depth gaps — memory UX, venture apps, dev overlay, input modalities.

### Objectives

1. Ship **memory browser** with user-facing categories and edit/forget.
2. Build **Harvi and TruAfrica** bridge modules and venture apps.
3. Implement **Developer Mode overlay** — move Command Center content behind goggles.
4. Complete **gesture vocabulary**, **voice modes**, and **camera privacy** UX.
5. Enforce **registry approval levels** centrally on all write capabilities.

### Deliverables

| Deliverable | Description | Gap IDs |
|-------------|-------------|---------|
| Memory class persistence | Write `memoryClass` to DB; promotion on "remember this" | MEM-1 |
| Memory browser | Preferences / Decisions / People / Instructions / Topics | MEM-2 |
| Edit and forget UX | Memory app depth + Jarvis "forget that" wired to delete | MEM-3 |
| Harvi bridge module | HTTP client mirroring finance-tracker pattern | APP-2, EXT-2 |
| TruAfrica bridge module | Same pattern for TruAfrica API | APP-2, EXT-2 |
| Venture apps + badge | Harvi and TruAfrica in launcher; venture badge on chrome | NAV-5, APP-2 |
| Jarvis venture routing | "For Harvi..." routes to venture capabilities | EXT-2 |
| Source attribution | Consistent "From Finance Tracker..." in Jarvis responses | EXT-3 |
| Developer Mode overlay | Voice + shortcut + version tap; diagnostics, agent log, memory inspector, routing trace | DEV-1 |
| Command Center migration | Console content moves into dev overlay panels | DEV-1, DEV-2 |
| Gesture vocabulary | Swipe up → Today, circle → search, fist → cancel, etc. | GEST-1, GEST-2 |
| Camera privacy UX | First-enable modal, persistent indicator, default off | CAM-2 |
| Camera presence hooks | Pause/resume TTS on attention away | CAM-1 |
| Voice modes setting | Ambient, push-to-talk, conversation, command, dictation | VOICE-2 |
| Wake word (opt-in) | Ambient mode for trusted environments | VOICE-1 |
| Live captions + Stop | Persistent caption bar; universal Stop | VOICE-3 |
| Central approval enforcement | Registry `approval` → module `requiresApproval` | FIN-3 |
| Onboarding flow | Connect first app → land on Today | NAV-6 |
| Minimize/peek/split | Workspace multitasking patterns | WORK-3 |
| Mode workspace behaviors | Focus, Presentation, Research layouts | WORK-4 |

### Files likely affected

**New files:**
- `libs/modules/harvi/src/index.ts`, `client.ts`, `types.ts`
- `libs/modules/truafrica/src/index.ts`, `client.ts`, `types.ts`
- `apps/web/src/components/dev/DeveloperOverlay.tsx`
- `apps/web/src/components/memory/MemoryBrowser.tsx`
- `apps/web/src/components/onboarding/OnboardingFlow.tsx`
- `apps/web/src/app/app/[applicationId]/page.tsx` — unified app routes

**Modified files:**
- `libs/memory/memory/src/index.ts` — persist memoryClass
- `libs/agents/pool/src/memory-agent.ts` — promotion/forget semantics
- `apps/web/src/components/shell/GestureLayer.tsx` — full vocabulary + nav mapping
- `apps/web/src/components/shell/VoiceSessionProvider.tsx` — modes, captions, stop
- `apps/web/src/components/CommandCenter.tsx` — content extracted to dev overlay
- `libs/core/registry/src/registry.ts` — registry approval → requiresApproval
- `libs/runtime/src/index.ts` — register harvi/truafrica modules
- `apps/api/src/jarvis.controller.ts` — attribution templates

### Dependencies

- **Phases 1–3 complete** — Today, workspace, search, notifications foundation
- External Harvi/TruAfrica API availability (can ship connection UX + stubs first)
- Finance Tracker pattern as template for venture bridges

### Risks

| Risk | Mitigation |
|------|------------|
| Venture APIs not ready | Ship connection setup UX + Jarvis "not connected" plain-language errors |
| Developer overlay complexity | Migrate console panels incrementally; keep `/console` as fallback |
| Wake word licensing/accuracy | Opt-in only; push-to-talk remains default |
| Memory class migration | Backfill null class as `working`; map to user categories in UI |

### Exit criteria

- User can browse, edit, and forget memory by category
- Harvi and TruAfrica open as venture apps with live query when connected
- Developer Mode accessible via voice/shortcut; Command Center not in normal path
- Gestures support Today navigation; camera has privacy-first onboarding
- All registry write capabilities enforce approval level

---

## Cross-phase principles

1. **No architecture redesign** — event bus, module registry, agent framework, and contracts structure unchanged.
2. **Reuse before rebuild** — mount dead code (`AppWindow`), wire existing APIs, skin existing panels.
3. **Application registry is the bridge** — single catalog connects product names to module actions.
4. **Command Center retires from daily use** — becomes Developer Mode content, not home competitor.
5. **Each phase is shippable** — user-visible improvement at every phase boundary.

---

## Gap-to-phase mapping

| Gap ID | Phase |
|--------|-------|
| NAV-1, NAV-2, NAV-3 | 1 |
| NAV-4, NAV-5, NAV-6 | 2, 4 |
| HOME-1 | 1 |
| HOME-2, HOME-5 | 2 |
| HOME-3, HOME-4 | 1 placeholder, 3 full |
| JARVIS-1–6 | 2 |
| APP-1, APP-4 | 1 |
| APP-2 | 4 |
| APP-3 | 2 |
| SEARCH-1–3 | 3 |
| NOTIFY-1–4 | 3 |
| WORK-1, WORK-2 | 2 |
| WORK-3, WORK-4 | 4 |
| INTEL-1–3 | 1 partial, 3 full |
| MEM-1–3 | 4 |
| VOICE-1–3 | 4 |
| GEST-1, GEST-2 | 4 |
| CAM-1, CAM-2 | 4 |
| DEV-1, DEV-2 | 1 partial, 2 partial, 4 full |
| FIN-1 | 1 |
| FIN-2, FIN-3 | 2 |
| EXT-1 | 1 |
| EXT-2, EXT-3 | 4 |

---

## Related documents

- [gap-analysis.md](./gap-analysis.md) — full mismatch inventory
- [experience-model.md](./experience-model.md) — target experience
- [product-principles.md](./product-principles.md) — guiding principles
- [operating-model](../operating-model/README.md) — structural source of truth

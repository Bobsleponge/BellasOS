# BellasOS Navigation Model

How users move through BellasOS without routes, modules, or technical concepts.

**Related:** [workspace-model](./workspace-model.md) | [experience-model](./experience-model.md)

---

## Navigation hierarchy

```
Today (Home)
  |-- Jarvis (conversation / search)
  |-- Application (depth)
  |     -- Jarvis companion (optional)
  |-- Memory / History (invited depth)
  -- Developer Mode (overlay — not a destination)
```

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

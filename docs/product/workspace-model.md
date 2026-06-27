# BellasOS Workspace Model

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

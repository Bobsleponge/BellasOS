# Context Architecture

Jarvis maintains a **context stack** - the active frame for intent resolution.

## Context Layers

| Layer | Purpose |
|-------|---------|
| SessionContext | Current Jarvis conversation thread |
| FocusContext | Active entity (project, person, topic) |
| DomainContext | Primary domain lens |
| VentureContext | Active organization scope |
| TemporalContext | Time phase and urgency |
| ModalityContext | Voice, text, gesture, application |
| LocationContext | Physical or environment context |
| AttentionContext | What deserves focus now |

## Resolution Flow

1. Parse user input
2. Read context stack
3. **OpenAI Lead** produces an **Execution Plan** (what to fetch, clarify, synthesize)
4. Gather live data from application registry capabilities in parallel
5. Clarify missing user inputs (stored as `pendingExecution` on session) or synthesize answer
6. Local LLM executes plan with gathered context; OpenAI Review checks acceptance criteria
7. Respond in context
8. Update context stack

## Jarvis Cognition Loop

Every substantive Jarvis turn (when `OPENAI_API_KEY` is set and `JARVIS_HYBRID_MODE=openai-lead`) runs:

```
User message → OpenAI Execution Plan → parallel capability fetches → clarify OR synthesize → review → reply
```

Implementation: `libs/core/jarvis-cognition/`, wired from `apps/api/src/jarvis.controller.ts`.

### Execution Plan contract

The Lead returns JSON describing `queryKind` (lookup | advisory | write | navigate | chat), `contextFetches` (registry capability IDs), `missingUserInputs`, `clarifyingQuestions`, and `acceptanceCriteria`. The local model never routes alone.

### Advisory playbooks

Declared in `libs/shared/contracts/src/operating-model/advisory-playbooks.json`. Playbooks are **hints for the Lead**, not hard routers. Each playbook lists suggested capability fetches and required user inputs for a class of question (e.g. `wealth.property-purchase`).

### Adding a new app

1. Register capabilities in `application-registry.json` with `implementation.moduleId` + `action`
2. Optionally add an advisory playbook to `advisory-playbooks.json`
3. Jarvis Lead discovers capabilities automatically — no controller edits required

## Switching Rules

- Explicit signals override implicit signals
- Entity mention promotes focus
- Context decays after inactivity unless pinned
- Jarvis must explain active context on request
- Multi-venture context allowed for comparison queries

Canonical types: `libs/shared/contracts/src/operating-model/context.ts`

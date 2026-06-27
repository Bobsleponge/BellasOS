#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'operating-model');
mkdirSync(docsDir, { recursive: true });

const files = {
  'context.md': `# Context Architecture

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
3. Resolve ambiguity
4. Select domain lens
5. Bind focus entity
6. Route to agent or application capability
7. Respond in context
8. Update context stack

## Switching Rules

- Explicit signals override implicit signals
- Entity mention promotes focus
- Context decays after inactivity unless pinned
- Jarvis must explain active context on request
- Multi-venture context allowed for comparison queries

Canonical types: \`libs/shared/contracts/src/operating-model/context.ts\`
`,

  'memory.md': `# Memory Architecture

BellasOS uses **eight memory classes** mapped to three storage tiers.

## Memory Classes

| Class | Scope | Storage Tier |
|-------|-------|--------------|
| Short-Term | Current session | short |
| Working | Today / this week | working |
| Long-Term | Durable facts | long |
| Knowledge | Synthesized understanding | long |
| Decision | Choices and rationale | long |
| Relationship | People and connections | long |
| Episodic | Significant events | long |
| Procedural | How you prefer things done | long |

## Lifecycle

short_term -> working -> long_term -> knowledge (synthesis)
working -> decision (committed choice)
episodic -> knowledge (compression)

## Forgetting Rules

1. Superseded facts
2. Expired working memory
3. Low-confidence inferences
4. Explicit user deletion
5. Privacy boundaries
6. Stale external references
7. Redundant unpromoted chat

## Entity Binding

Every promoted memory carries: about (entity IDs), domainId, sourceRef, confidence, validFrom/validUntil.

Canonical types: \`libs/shared/contracts/src/operating-model/memory-classes.ts\`
`,

  'knowledge-graph.md': `# Knowledge Graph

The knowledge graph is BellasOS semantic layer - not a duplicate of every database.

## Graph Layers

| Layer | Entities |
|-------|----------|
| Identity | Person, Organization, Role, Relationship |
| Execution | Goal, Project, Task, Decision, Commitment |
| Cognitive | Topic, Research, Briefing, Insight, Alert |
| Wealth | Asset, Liability, FinancialSnapshot (refs) |
| Systems | Application, Capability, ResourceRef |
| Memory | Memory nodes linked to entities |

## Integrity Rules

1. External ResourceRefs resolve to Application capabilities for refresh
2. Insights cite sources
3. Decisions link to outcomes
4. Topics aggregate related intelligence
5. Graph optimized for Jarvis reasoning

## Example Query Paths

See \`GRAPH_QUERY_PATHS\` in \`knowledge-graph.ts\`.

Canonical types: \`libs/shared/contracts/src/operating-model/knowledge-graph.ts\`
`,

  'applications.md': `# Applications Model

Users interact with **Applications**, not modules.

## Application Types

| Type | Examples | BellasOS Role |
|------|----------|---------------|
| External (SoR) | Finance Tracker, Harvi, TruAfrica | Query, analyze, act via capabilities |
| Native | Research, Intelligence, Coding Studio | BellasOS-owned experience |
| Hybrid | Portfolio, Communications | Intelligence layer over partial SoR |

## Capability Manifest

Each application publishes capabilities with:
- Stable ID (e.g. wealth.summary.get)
- Access mode (read, write, analyze, publish, automate)
- Freshness policy (live, cached, scheduled_sync)
- Approval level (none, confirm, required)
- Intent examples for Jarvis routing
- Implementation mapping (moduleId + action) - platform layer only

## Registry

Full registry: \`libs/shared/contracts/src/operating-model/application-registry.json\`

Helpers: \`getApplication()\`, \`getCapability()\`, \`LEGACY_APP_ID_MAP\`
`,

  'external-systems.md': `# External Systems Architecture

## Federated Intelligence Pattern

1. User speaks to Jarvis
2. Jarvis resolves context + capability
3. BellasOS queries external Application (live when freshness requires)
4. External system returns authoritative data
5. BellasOS optionally caches snapshot + updates graph refs
6. Jarvis responds with unified intelligence

## Principles

1. Authoritative read from source when freshness matters
2. Cache with TTL and lastVerified
3. Index external signals - do not ingest Finance Tracker transactions as primary data
4. Write through to external Application for mutations
5. Subscribe to change events where available
6. Unified experience, federated data

## Awareness Records

- ResourceRef - pointer to external object
- Snapshot - cached summary with timestamp
- SyncState - last sync and errors
- CapabilityState - action availability
- HealthState - connectivity and auth

## Anti-Patterns

- Copying Finance Tracker transactions into Postgres as primary store
- Answering financial questions from memory when live query is available
- Duplicating documents owned by venture applications
`,

  'agents.md': `# Agent Architecture

Jarvis is the **sole user-facing agent**. All specialists work behind Jarvis.

## Specialist Agents

| Agent | Domain | Applications |
|-------|--------|--------------|
| Jarvis | All | Orchestrator |
| Memory | Identity, Relationships | Memory gateway |
| Research | Knowledge | research |
| Intelligence | Intelligence | intelligence |
| Wealth | Wealth | finance-tracker, portfolio |
| Venture | Ventures, Execution | harvi-and-co, truafrica |
| Communications | Communications | communications |
| Environment | Environment | automation |
| Coding | Execution | coding-studio |
| Operations | Systems | Operator mode only |

## Collaboration Patterns

- Sequential handoff
- Parallel fan-out (daily briefing)
- Escalation (wealth anomaly + intelligence check)
- Human-in-loop (approvals)

## Memory Access

See \`AGENT_MEMORY_ACCESS\` in \`agents.ts\`.

Canonical catalog: \`libs/shared/contracts/src/operating-model/agents.ts\`
`,

  'automation.md': `# Automation Architecture

## Components

Event, Trigger, Condition, Action, Approval, Workflow, Schedule, Background Intelligence

## Event Sources

- External application webhooks and polls
- Ingestion pipeline
- Agent completion events
- Environment sensors
- User lifecycle
- Calendar-like events
- Graph changes

## Background Jobs

Feed poll, price refresh, briefing generation, integration health, alert evaluation, resource ref revalidation, scheduled publish

## Approval Matrix

See \`APPROVAL_MATRIX\` in \`automation.ts\`.

Automations invoke Application capabilities - never modules directly from user-facing flows.

Canonical types: \`libs/shared/contracts/src/operating-model/automation.ts\`
`,

  'daily-os-jarvis.md': `# Daily Operating System and Jarvis Behavior

## Day Phases

| Phase | Platform | Jarvis |
|-------|----------|--------|
| Arrival | Overnight intelligence, daily context assembly | Proactive briefing, surface approvals |
| Execution | Working memory, write-through to SoR | Delegate, context-switch, capture decisions |
| Intelligence | Topic monitoring, alert evaluation | Contextual delivery, cross-domain links |
| Synthesis | Episodic capture, seed tomorrow | Evening review, decision prompts |
| Background | Worker jobs, graph revalidation | Silent unless critical |

## Operating Modes

| Mode | Emphasis |
|------|----------|
| Personal | Life, relationships, environment |
| Business | Ventures, execution, communications |
| Wealth | Live finance, decision memory |
| Research | Deep citation-rich responses |
| Focus | Single project, minimal interruption |
| Operator | Systems diagnostics (hidden default) |

## Five Life Dimensions

1. Personal life
2. Financial life
3. Business life
4. Intellectual life
5. Digital life

Jarvis holds the integrated narrative across all five.

Canonical specs: \`libs/shared/contracts/src/operating-model/jarvis-behavior.ts\`
`,
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(docsDir, name), content, 'utf8');
  console.log('wrote', name);
}

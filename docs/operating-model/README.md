# BellasOS Operating Model

Foundation document for all future BellasOS architecture, applications, workflows,
memory, intelligence, automation, and experience design.

**Canonical contracts:** [`libs/shared/contracts/src/operating-model`](../../libs/shared/contracts/src/operating-model)

---

## What BellasOS Organizes

BellasOS organizes **your world as a living system of commitments, relationships,
knowledge, and connected digital systems** — and provides **intelligence,
orchestration, and memory** across all of it.

It does not primarily organize data. It organizes **meaning, attention, and action**
across:

- Who you are and who matters to you
- What you are building (businesses, projects, ventures)
- What you are pursuing (goals, decisions, priorities)
- What you know (research, documents, synthesized intelligence)
- What is happening in the world that affects you
- What you own and operate (applications, automations, external systems)
- What requires your attention right now

BellasOS sits **above** domain-specific applications. Those applications remain
systems of record. BellasOS is the **system of intelligence**.

---

## Foundational Principles

1. **Intelligence over storage** — Remember what matters for reasoning; external apps store operational data.
2. **Reference over replication** — Pointers, snapshots, summaries, indexes — not full duplication.
3. **Context before capability** — Resolve who, what, where, when, why before how.
4. **Applications over modules** — Users interact with Applications; modules are platform plumbing.
5. **Decisions are first-class** — Outcomes and rationale are as important as facts.
6. **Attention is the scarce resource** — Organize what deserves focus.
7. **Proactive and reactive** — Works while you sleep; responds when you speak.
8. **Single owner, multi-world** — One primary user; many businesses, projects, and life domains.

---

## Document Index

| Document | Contents |
|----------|----------|
| [domains-entities-relationships.md](./domains-entities-relationships.md) | Domains, entities, relationship taxonomy |
| [context.md](./context.md) | Context stack, resolution, switching rules |
| [memory.md](./memory.md) | Eight memory classes, lifecycle, forgetting |
| [knowledge-graph.md](./knowledge-graph.md) | Graph layers, integrity rules, query paths |
| [applications.md](./applications.md) | Application model, registry, capability manifests |
| [external-systems.md](./external-systems.md) | Federated intelligence, integration principles |
| [agents.md](./agents.md) | Specialist agents, Jarvis orchestration, access rules |
| [automation.md](./automation.md) | Events, triggers, workflows, approvals |
| [daily-os-jarvis.md](./daily-os-jarvis.md) | Daily phases, operating modes, Jarvis behavior |

## Product design

User experience and interaction specifications:

- [`docs/product`](../product/README.md) — how BellasOS feels and behaves for users

---

## Alignment with Current Platform

| Operating model concept | Current implementation seed |
|-------------------------|----------------------------|
| Memory classes | `MemoryTier` short/working/long in `@bellasos/contracts` |
| External applications | `@bellasos/core-external-apps`, Finance Tracker bridge |
| Jarvis orchestrator | `apps/api/src/jarvis-orchestrator.ts` |
| Specialist agents | `libs/agents/pool/` |
| Event bus | `libs/core/events/` |
| Module registry | Maps to Application capabilities (implementation layer) |

Modules remain the **implementation layer**. Applications are the **user and Jarvis
facing concept**.

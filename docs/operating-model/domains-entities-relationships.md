# Domains, Entities, and Relationships

Canonical vocabulary for BellasOS. Source of truth for types:
[`libs/shared/contracts/src/operating-model`](../../libs/shared/contracts/src/operating-model).

---

## Major Domains

BellasOS understands **twelve domains** — organizing lenses through which Jarvis
interprets your world.

| Domain | Tier | System of Record |
|--------|------|------------------|
| Identity | Existential | BellasOS |
| Relationships | Existential | BellasOS |
| Life | Existential | Mixed |
| Ventures | Constructive | Each venture application |
| Execution | Constructive | Venture PM tools; BellasOS orchestrates cross-venture |
| Wealth | Constructive | Finance Tracker |
| Knowledge | Cognitive | BellasOS + source apps |
| Intelligence | Cognitive | BellasOS (synthesized) |
| Communications | Cognitive | Platform apps; BellasOS orchestrates |
| Environment | Operational | Home Assistant |
| Systems | Operational | BellasOS registry |
| Automation | Operational | BellasOS automation engine |

Each domain declares: owner app, intelligence scope, action scope, memory scope,
and freshness policy (live, cached, scheduled sync).

---

## Core Entity Model

### Self and Social
- **Person** — Human being
- **Relationship** — Typed connection to a Person
- **Role** — Contextual hat (CEO, founder, father)

### Organizational
- **Organization** — Business or venture (Harvi and Co, TruAfrica)
- **Team** — Group within an Organization
- **Membership** — Person ↔ Organization with Role

### Execution
- **Goal**, **Decision**, **Project**, **Task**, **Commitment**, **Meeting**, **Event**

### Cognitive
- **Topic**, **Research**, **Document**, **Note**, **Briefing**, **Alert**, **Insight**

### Wealth
- **Asset**, **Liability**, **Transaction** (references)
- **FinancialSnapshot**, **FinancialDecision**

### Systems
- **Application**, **Integration**, **Capability**, **Resource**, **ResourceRef**

### Platform
- **Memory**, **Context**, **Session**, **Agent**, **AgentRun**, **Automation**, **Workflow**, **Approval**

### Entity Identity Rules

1. Every entity has a BellasOS ID.
2. External entities carry a **ResourceRef** (applicationId, resourceType, externalId, lastVerifiedAt).
3. BellasOS never merges external records without explicit linking.
4. Goals, Decisions, Notes, and Memories may exist natively in BellasOS.

---

## Relationship Taxonomy

### Structural
`owns`, `contains`, `part_of`, `belongs_to`

### Causal
`drives`, `informs`, `produces`, `affects`, `blocks`

### Social
`knows`, `works_with`, `reports_to`, `represents`

### Operational
`serves`, `records`, `exposes`, `references`, `triggers`, `requires_approval`

### Temporal
`precedes`, `supersedes`, `scheduled_for`

### Rules

1. Cross-domain links are encouraged.
2. External relationships are cached with `lastVerifiedAt`.
3. Edges carry confidence: explicit, inferred, stale.
4. No orphan intelligence — Insights, Briefings, and promoted Memories link to entities or Topics.

See `relationships.ts` for `CORE_RELATIONSHIP_CONSTRAINTS` used in graph validation.

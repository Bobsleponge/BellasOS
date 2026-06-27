# Memory Architecture

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

Canonical types: `libs/shared/contracts/src/operating-model/memory-classes.ts`

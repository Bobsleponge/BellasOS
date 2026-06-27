# Knowledge Graph

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

See `GRAPH_QUERY_PATHS` in `knowledge-graph.ts`.

Canonical types: `libs/shared/contracts/src/operating-model/knowledge-graph.ts`

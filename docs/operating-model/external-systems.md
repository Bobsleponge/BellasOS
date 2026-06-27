# External Systems Architecture

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

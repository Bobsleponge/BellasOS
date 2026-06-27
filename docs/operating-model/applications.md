# Applications Model

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

Full registry: `libs/shared/contracts/src/operating-model/application-registry.json`

Helpers: `getApplication()`, `getCapability()`, `LEGACY_APP_ID_MAP`

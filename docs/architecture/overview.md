# BellasOS Architecture Overview

BellasOS is a modular, event-driven, AI-agnostic personal intelligence and
automation platform. This document summarises how the implemented system maps
onto the approved architecture.

## Layered architecture

```
+--------------------------------------------------------------+
| Apps:  web (Command Center)   api (NestJS)   worker (agents)  |
+--------------------------------------------------------------+
| Layer 5  Modules: llm, research, intelligence, portfolio,    |
|          social, automation, voice, camera  (plugins)        |
+--------------------------------------------------------------+
| Layer 3  Agents: framework + orchestrator + pool             |
+--------------------------------------------------------------+
| Layer 4  Memory: short (Redis) / working / long (pgvector)   |
+--------------------------------------------------------------+
| Layer 2  AI: gateway + providers + routing + model registry  |
+--------------------------------------------------------------+
| Layer 1  Core: events, registry, auth, config, audit, notify |
+--------------------------------------------------------------+
| Shared: contracts, observability, db                         |
+--------------------------------------------------------------+
```

Dependency rule: arrows point downward only. A module may depend on Core and
Shared, never on another module's code. Enforced by Nx tags +
`@nx/enforce-module-boundaries`.

## Key flows

- **Module action**: `HTTP -> AuthGuard (principal) -> ModuleRegistry.dispatch
  -> permission check -> input validation -> (approval gate) -> module.handle
  -> audit + metrics -> response`.
- **AI request**: `AIGateway.complete -> RoutingEngine (cost/latency/privacy/
  task) -> ProviderAdapter -> usage/cost recorded -> (mock fallback on failure)`.
- **Agent task**: `Orchestrator.command|assign -> BaseAgent.handle (run tracing)
  -> AI/memory work -> emit events`. Async tasks travel as
  `agent.task.assigned` events consumed via a NATS queue group.
- **Memory**: long-term writes are embedded and stored in pgvector; recall does
  cosine similarity search (keyword fallback when degraded).

## Contracts as the source of truth

`@bellasos/contracts` defines every cross-boundary type and interface
(`ModuleManifest`, `ModuleRuntime`, `EventEnvelope`, `AIGateway`,
`MemoryGateway`, `Principal`, the API envelope). Modules and agents depend only
on these interfaces, so any implementation can be replaced.

## Degraded mode

If Postgres, NATS or Redis are unreachable, the platform boots using in-memory
adapters and the offline mock AI provider. This guarantees a working dev loop
and resilient startup, and is the reason the API can run with zero external
infrastructure.

## Deployment evolution

1. **Local Docker Compose** (now): datastores + infra in containers, apps on the
   host with hot reload, or fully containerised via the prod overlay.
2. **Single-host prod**: `docker-compose.prod.yml` builds app images, runs
   migrations as a one-shot job, starts api/worker/web.
3. **Kubernetes/hybrid** (future): stateless apps become Deployments with HPA;
   Postgres/Redis/NATS managed or StatefulSets; secrets via Vault/KMS.

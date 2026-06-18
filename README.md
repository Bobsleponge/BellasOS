# BellasOS

> **⚠️ v0.1 — WORK IN PROGRESS / BROKEN**
>
> This is the first snapshot of BellasOS. Expect rough edges and incomplete flows.
> Known issues at this tag include: voice/STT reliability, dev-server/UTF-16 file
> encoding pitfalls on Windows, and modules that still return placeholder content when
> AI providers are misconfigured. Not recommended for production use.

A modular, event-driven, AI-agnostic personal intelligence and automation
operating system. Jarvis is merely the primary interface; BellasOS is the
platform underneath it.

> Architecture reference: see [`docs/architecture`](docs/architecture) and the
> approved plan. This repository implements that architecture layer by layer.

## Layers

1. **Core Platform** — auth/RBAC, users, module registry, config, audit,
   notifications, event bus. (`libs/core/*`)
2. **AI Layer** — vendor-agnostic gateway, provider adapters, model registry,
   routing engine, usage tracking. (`libs/ai/*`)
3. **Agent Framework** — base agents, orchestrator, agent pool. (`libs/agents/*`)
4. **Memory System** — short-term / working / long-term tiers with pgvector
   semantic search. (`libs/memory/*`)
5. **Modules** — installable, removable feature modules. (`libs/modules/*`)

Apps: `apps/api` (NestJS host), `apps/worker` (agent runtime),
`apps/web` (Next.js Command Center).

## Quick start

```bash
# 1. Install dependencies (Nx monorepo, npm workspaces)
npm install

# 2. Start infrastructure (Postgres+pgvector, Redis, NATS, Keycloak, observability)
npm run infra:up

# 3. Apply database migrations
cp .env.example .env
npm run db:migrate

# 4. Run the platform (separate terminals)
npm run dev:api      # http://localhost:4000/api/v1
npm run dev:worker
npm run dev:web      # http://localhost:3000
```

The platform is designed to **degrade gracefully**: if Postgres or NATS are not
reachable, it falls back to in-memory adapters so you can boot and explore
without the full stack.

## Design principles

- **Modular first** — every capability is an installable/removable module.
- **API first** — modules expose actions/events/permissions; no module imports
  another's internals.
- **Event driven** — all cross-component communication flows over the event bus.
- **AI agnostic** — providers are replaceable behind a unified gateway.
- **Secure by default** — authN/authZ, audit, approvals, RBAC (ABAC-ready).

## Repository layout

```
apps/        api, worker, web
libs/
  shared/    contracts, observability, db, ui
  core/      events, registry, auth, config, audit, notifications
  ai/        gateway, providers, routing, model-registry
  memory/    tiered memory + retrieval
  agents/    framework, orchestrator, pool
  modules/   llm, research, intelligence, portfolio, social, automation, voice, camera
infra/       docker, compose, k8s, keycloak, grafana, prometheus, loki
docs/        architecture, adr
tools/       generators
```

## Module boundaries

Dependency direction is enforced by Nx tags + ESLint
(`@nx/enforce-module-boundaries`). `scope:module` may only depend on
`scope:core` and `scope:shared`; nothing depends on a feature module's code.

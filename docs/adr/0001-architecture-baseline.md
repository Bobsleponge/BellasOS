# ADR 0001: Architecture baseline

- Status: Accepted
- Date: 2026-06-17

## Context

BellasOS must remain viable and extensible for 10+ years, run locally on Docker
first, and migrate to cloud/hybrid later without a rewrite. It must be modular,
event-driven and AI-agnostic.

## Decision

- **Monorepo: Nx + npm workspaces.** Enforced module boundaries via Nx tags and
  `@nx/enforce-module-boundaries`, affected-only CI, generators for scaffolding.
- **Backend: NestJS (api host) + a worker process** for agents/workflows.
- **Frontend: Next.js + React + TypeScript + Tailwind + Zustand + TanStack Query.**
- **Datastore: PostgreSQL with pgvector**, schema-per-bounded-context, raw SQL
  migrations applied by a startup runner.
- **DB access: Kysely** (typed query builder) over a heavy ORM, to keep pgvector
  and Postgres features first class.
- **Messaging: NATS JetStream** with a versioned event envelope; in-process
  fallback so the platform boots without infrastructure.
- **Auth: Keycloak (OIDC)** with RBAC now and an ABAC-ready policy seam.
- **Contracts: Zod + OpenAPI** as the single source of truth.
- **AI: a custom provider abstraction** rather than a single vendor SDK or a
  framework, so providers are replaceable.

## Consequences

- Strong isolation and replaceability at the cost of more upfront structure.
- Modules are in-process plugins now but communicate only via the Module API and
  events, enabling later extraction into independent services/containers.
- Degraded-mode adapters add a little complexity but greatly improve DX and
  resilience.

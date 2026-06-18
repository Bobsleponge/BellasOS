# ADR 0003: Deployment & operations

- Status: Accepted
- Date: 2026-06-17

## Context

The platform runs locally on Docker first but must migrate to cloud/hybrid
without a rewrite. Apps must stay stateless so they can scale horizontally.

## Decision

- **Containers**: multi-stage Docker images; a base `docker-compose.yml` for
  infra (Postgres+pgvector, Redis, NATS JetStream, Keycloak, Prometheus, Loki,
  Promtail, Grafana) with `dev` and `prod` overlays.
- **Migrations**: forward-only SQL files applied by an idempotent runner,
  tracked in `public._migrations`, run as a one-shot job before app start.
- **Observability**: structured pino logs shipped to Loki via Promtail;
  Prometheus scrapes `/metrics`; Grafana dashboards. Trace ids propagate from
  the HTTP edge through events, AI calls and agent runs.
- **CI**: GitHub Actions using `nx affected` for typecheck/test/lint, with a
  Postgres service to run migrations.
- **Scale path**: apps are stateless (state in Postgres/Redis/NATS), so the move
  to Kubernetes is packaging: Deployments + HPA for api/worker, managed/clustered
  datastores, NATS JetStream clustering, ExternalSecrets/Vault for credentials.

## Consequences

- One command (`npm run infra:up`) gives a full local stack.
- The same images and migration job are reused from single-host to Kubernetes.

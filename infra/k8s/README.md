# Kubernetes (future)

Phase C of the deployment roadmap lifts BellasOS from Docker Compose to
Kubernetes. The architecture keeps application services stateless (state lives
in Postgres, Redis and NATS), so the migration is largely packaging:

- Helm chart per deployable: `api`, `worker`, `web`.
- `StatefulSet` + managed services for Postgres (pgvector), Redis, NATS cluster.
- `ExternalSecrets` / Vault for provider credentials (replaces env injection).
- HorizontalPodAutoscaler on `api` and per-agent `worker` deployments.
- NATS JetStream clustering for durable, replayable events at scale.

This directory will hold the Helm charts. It is intentionally empty until
Phase C; no code depends on it.

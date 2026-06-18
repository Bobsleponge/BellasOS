# ADR 0002: Security model

- Status: Accepted
- Date: 2026-06-17

## Context

BellasOS stores financial and business-critical data and will act on the user's
behalf (publishing, controlling devices). Every action must be authenticated,
authorized, audited, and (where sensitive) gated by approval.

## Decision

- **Authentication**: Keycloak OIDC in production; a local HS256 dev token in
  dev mode (`AUTH_MODE=dev`) so the platform runs without Keycloak. Tokens are
  verified centrally by `AuthService` and resolved into a `Principal`.
- **Authorization**: RBAC now (roles -> permissions, wildcard `*` and
  `domain.*` grants). An ABAC `PolicyEngine` seam evaluates contextual policies
  (ownership, data classification) AFTER RBAC, so it can only further restrict.
- **Audit**: every module action and security decision is written to an
  append-only, monthly-partitioned `core.audit_log` with trace correlation.
- **Approvals**: actions flagged `requiresApproval` (e.g. `social.publish`)
  create a pending approval and emit `approval.requested`; an authorised user
  resolves it, after which the action is executed with `skipApproval`.
- **Secrets**: never stored in plaintext columns or logs (pino redaction). A
  pluggable `SecretsBackend` (env now, Vault/KMS later) resolves secrets by ref.
- **Data classification + AI privacy routing**: `restricted`/`confidential`
  inputs force local models in the routing engine.
- **Module sandboxing**: modules get only a scoped context (private KV
  namespace, namespaced config, the event bus, AI and memory gateways) and can
  never import another module's code or read its data.

## Consequences

- Strong, uniform enforcement at the single `dispatch` chokepoint.
- ABAC and Vault are seams today (with example policies / a Vault client) and can
  be hardened without touching callers.

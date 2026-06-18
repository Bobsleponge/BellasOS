-- Core platform schema: identity, access, modules, audit, approvals, config.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE core.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  attributes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE core.permissions (
  key text PRIMARY KEY,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE core.role_permissions (
  role_id text NOT NULL REFERENCES core.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES core.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE core.user_roles (
  user_id uuid NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES core.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE core.modules (
  id text PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'registered',
  manifest jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core.module_settings (
  module_id text NOT NULL REFERENCES core.modules(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  is_secret boolean NOT NULL DEFAULT false,
  PRIMARY KEY (module_id, key)
);

-- Module private key/value namespace (one logical "schema" per module id).
CREATE TABLE core.module_kv (
  module_id text NOT NULL,
  key text NOT NULL,
  value jsonb,
  PRIMARY KEY (module_id, key)
);

CREATE TABLE core.config (
  namespace text NOT NULL,
  key text NOT NULL,
  value jsonb,
  is_secret boolean NOT NULL DEFAULT false,
  secret_ref text,
  PRIMARY KEY (namespace, key)
);

-- Append-only audit log, partitioned by month for retention + performance.
CREATE TABLE core.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id text,
  actor_type text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  target text,
  outcome text NOT NULL DEFAULT 'ok',
  trace_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- A default catch-all partition keeps inserts working before monthly partitions
-- are provisioned by an ops job.
CREATE TABLE core.audit_log_default PARTITION OF core.audit_log DEFAULT;
CREATE INDEX idx_audit_trace ON core.audit_log (trace_id);
CREATE INDEX idx_audit_actor ON core.audit_log (actor_id);

CREATE TABLE core.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  module_id text NOT NULL,
  action text NOT NULL,
  input jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  resolver_id text,
  trace_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_approvals_status ON core.approvals (status);

CREATE TABLE core.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON core.notifications (user_id, read);

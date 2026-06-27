-- AI layer schema: providers, models, usage, benchmarks.
CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE ai.providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'enabled',
  credentials_ref text
);

CREATE TABLE ai.models (
  id text PRIMARY KEY,
  provider_id text NOT NULL REFERENCES ai.providers(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}',
  context_window integer NOT NULL DEFAULT 8192,
  cost jsonb NOT NULL DEFAULT '{}'::jsonb,
  local boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE ai.usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  task_type text NOT NULL DEFAULT 'general',
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  actor_id text,
  trace_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE ai.usage_default PARTITION OF ai.usage DEFAULT;
CREATE INDEX idx_ai_usage_model ON ai.usage (model);
CREATE INDEX idx_ai_usage_trace ON ai.usage (trace_id);

CREATE TABLE ai.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  task_type text NOT NULL,
  score numeric(6,3) NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

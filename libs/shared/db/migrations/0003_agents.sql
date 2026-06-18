-- Agent framework schema: agent definitions and traced runs.
CREATE SCHEMA IF NOT EXISTS agents;

CREATE TABLE agents.agents (
  id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'enabled',
  config jsonb
);

CREATE TABLE agents.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  agent_type text NOT NULL,
  task_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error text,
  trace_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX idx_agent_runs_trace ON agents.runs (trace_id);
CREATE INDEX idx_agent_runs_agent ON agents.runs (agent_id);
CREATE INDEX idx_agent_runs_status ON agents.runs (status);

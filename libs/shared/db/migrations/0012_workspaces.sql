-- Workspaces, focus sessions, and artifacts for execution layer.
CREATE TABLE IF NOT EXISTS execution.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  title text NOT NULL,
  objective text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  domain_id text NOT NULL,
  organization_id text,
  application_ids text[] NOT NULL DEFAULT '{}',
  goal_ids text[] NOT NULL DEFAULT '{}',
  initiative_ids text[] NOT NULL DEFAULT '{}',
  decision_ids text[] NOT NULL DEFAULT '{}',
  artifact_ids text[] NOT NULL DEFAULT '{}',
  research_ids text[] NOT NULL DEFAULT '{}',
  memory_ids text[] NOT NULL DEFAULT '{}',
  world_sector_tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  progress_summary text,
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON execution.workspaces (owner_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS execution.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  workspace_id uuid REFERENCES execution.workspaces(id) ON DELETE SET NULL,
  focus_kind text NOT NULL DEFAULT 'general',
  focus_entity jsonb,
  jarvis_session_id text,
  application_id text,
  status text NOT NULL DEFAULT 'active',
  summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_owner ON execution.focus_sessions (owner_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS execution.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  summary text,
  content_ref jsonb,
  workspace_ids text[] NOT NULL DEFAULT '{}',
  goal_ids text[] NOT NULL DEFAULT '{}',
  initiative_ids text[] NOT NULL DEFAULT '{}',
  decision_ids text[] NOT NULL DEFAULT '{}',
  application_ids text[] NOT NULL DEFAULT '{}',
  memory_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artifacts_owner ON execution.artifacts (owner_id, updated_at DESC);

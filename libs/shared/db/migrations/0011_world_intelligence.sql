-- World intelligence enrichments, trends, and summaries.
CREATE SCHEMA IF NOT EXISTS intelligence;

CREATE TABLE intelligence.world_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  ingest_doc_id text NOT NULL,
  sector text NOT NULL,
  relevance jsonb NOT NULL DEFAULT '{}'::jsonb,
  opportunity jsonb,
  composite_score numeric(4,3) NOT NULL DEFAULT 0.5,
  goal_ids text[] NOT NULL DEFAULT '{}',
  initiative_ids text[] NOT NULL DEFAULT '{}',
  decision_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_world_enrichments_doc ON intelligence.world_enrichments (owner_id, ingest_doc_id);
CREATE INDEX idx_world_enrichments_sector ON intelligence.world_enrichments (owner_id, sector);

CREATE TABLE intelligence.world_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  sector text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'down', 'flat', 'volatile')),
  doc_count integer NOT NULL DEFAULT 0,
  window_hours integer NOT NULL DEFAULT 12,
  summary text NOT NULL,
  confidence numeric(4,3) NOT NULL DEFAULT 0.5,
  linked_goal_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_world_trends_owner ON intelligence.world_trends (owner_id, sector, created_at DESC);

CREATE TABLE intelligence.world_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  headline text NOT NULL,
  sector text NOT NULL,
  relevance_line text,
  trend_direction text,
  rhythm text NOT NULL DEFAULT 'morning',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_world_summaries_owner ON intelligence.world_summaries (owner_id, created_at DESC);

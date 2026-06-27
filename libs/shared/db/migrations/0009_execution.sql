-- Execution layer: goals, initiatives, and graph links.
CREATE SCHEMA IF NOT EXISTS execution;

CREATE TABLE execution.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  momentum text NOT NULL DEFAULT 'steady'
    CHECK (momentum IN ('accelerating', 'steady', 'slowing', 'blocked')),
  organization_id text,
  application_ids text[] NOT NULL DEFAULT '{}',
  goal_ids uuid[] NOT NULL DEFAULT '{}',
  project_ids text[] NOT NULL DEFAULT '{}',
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  started_at timestamptz,
  target_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_execution_initiatives_owner ON execution.initiatives (owner_id, status);

CREATE TABLE execution.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  objective text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('personal', 'business', 'financial', 'project', 'research', 'learning', 'operational')),
  domain_id text NOT NULL,
  horizon text NOT NULL DEFAULT 'ongoing'
    CHECK (horizon IN ('weekly', 'monthly', 'quarterly', 'yearly', 'ongoing')),
  deadline_at timestamptz,
  target jsonb,
  progress jsonb NOT NULL DEFAULT '{"trend":"unknown"}'::jsonb,
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  initiative_id uuid REFERENCES execution.initiatives(id) ON DELETE SET NULL,
  organization_id text,
  application_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_execution_goals_owner ON execution.goals (owner_id, status);
CREATE INDEX idx_execution_goals_initiative ON execution.goals (initiative_id);

CREATE TABLE execution.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  type text NOT NULL,
  from_id text NOT NULL,
  to_id text NOT NULL,
  confidence text NOT NULL DEFAULT 'explicit'
    CHECK (confidence IN ('explicit', 'inferred', 'stale')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_execution_links_from ON execution.links (from_id, type);
CREATE INDEX idx_execution_links_to ON execution.links (to_id, type);

-- Seed default initiatives and goals for dev admin user.
INSERT INTO execution.initiatives (
  id, owner_id, name, description, status, momentum, organization_id,
  application_ids, priority, started_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'Build BellasOS',
    'Ship the personal intelligence operating system.',
    'active', 'accelerating', NULL,
    ARRAY['coding-studio'], 1, now()
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000001',
    'Grow Harvi',
    'Expand Harvi and Co order volume and operational capacity.',
    'active', 'steady', 'org:harvi',
    ARRAY['harvi-and-co'], 1, now()
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000001',
    'Launch TruAfrica',
    'Prepare TruAfrica market entry and launch milestones.',
    'active', 'steady', 'org:truafrica',
    ARRAY['truafrica'], 2, now()
  ),
  (
    '11111111-1111-1111-1111-111111111104',
    '00000000-0000-0000-0000-000000000001',
    'Property Portfolio Expansion',
    'Grow property holdings and portfolio diversification.',
    'active', 'steady', NULL,
    ARRAY['wealth'], 2, now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO execution.goals (
  id, owner_id, objective, category, domain_id, horizon, deadline_at,
  target, progress, priority, status, initiative_id, organization_id, application_ids
) VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '00000000-0000-0000-0000-000000000001',
    'Ship Jarvis goal-aware intelligence layer',
    'operational', 'systems', 'quarterly', NULL,
    '{"metric":"feature_milestones","targetValue":1,"direction":"increase"}'::jsonb,
    '{"current":1,"baseline":0,"pct":85,"trend":"up","updatedAt":"2026-06-20T00:00:00.000Z"}'::jsonb,
    1, 'active', '11111111-1111-1111-1111-111111111101', NULL, ARRAY['coding-studio']
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '00000000-0000-0000-0000-000000000001',
    'Reach weekly order growth target for Harvi',
    'business', 'ventures', 'weekly', NULL,
    '{"metric":"weekly_orders","targetValue":10,"unit":"orders","direction":"increase"}'::jsonb,
    '{"current":12,"baseline":8,"pct":120,"trend":"up","updatedAt":"2026-06-20T00:00:00.000Z"}'::jsonb,
    1, 'active', '11111111-1111-1111-1111-111111111102', 'org:harvi', ARRAY['harvi-and-co']
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '00000000-0000-0000-0000-000000000001',
    'Complete TruAfrica launch readiness checklist',
    'business', 'ventures', 'quarterly', NULL,
    '{"metric":"launch_readiness_pct","targetValue":100,"unit":"percent","direction":"increase"}'::jsonb,
    '{"current":45,"baseline":30,"pct":45,"trend":"up","updatedAt":"2026-06-20T00:00:00.000Z"}'::jsonb,
    2, 'active', '11111111-1111-1111-1111-111111111103', 'org:truafrica', ARRAY['truafrica']
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '00000000-0000-0000-0000-000000000001',
    'Grow net worth by 5% this quarter',
    'financial', 'wealth', 'quarterly', NULL,
    '{"metric":"net_worth_pct","targetValue":5,"unit":"percent","direction":"increase"}'::jsonb,
    '{"current":2.1,"baseline":0,"pct":42,"trend":"up","updatedAt":"2026-06-20T00:00:00.000Z"}'::jsonb,
    2, 'active', '11111111-1111-1111-1111-111111111104', NULL, ARRAY['wealth']
  )
ON CONFLICT (id) DO NOTHING;

UPDATE execution.initiatives SET goal_ids = ARRAY[
  '22222222-2222-2222-2222-222222222201'::uuid
] WHERE id = '11111111-1111-1111-1111-111111111101';

UPDATE execution.initiatives SET goal_ids = ARRAY[
  '22222222-2222-2222-2222-222222222202'::uuid
] WHERE id = '11111111-1111-1111-1111-111111111102';

UPDATE execution.initiatives SET goal_ids = ARRAY[
  '22222222-2222-2222-2222-222222222203'::uuid
] WHERE id = '11111111-1111-1111-1111-111111111103';

UPDATE execution.initiatives SET goal_ids = ARRAY[
  '22222222-2222-2222-2222-222222222204'::uuid
] WHERE id = '11111111-1111-1111-1111-111111111104';

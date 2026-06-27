-- Execution layer: decisions, outcomes, and reviews.
CREATE TABLE execution.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  title text NOT NULL,
  question text NOT NULL,
  rationale text,
  category text NOT NULL
    CHECK (category IN ('business', 'financial', 'product', 'research', 'operational', 'personal')),
  domain_id text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'decided', 'deferred', 'superseded', 'cancelled')),
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  confidence jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  chosen_option_id text,
  deadline_at timestamptz,
  goal_ids uuid[] NOT NULL DEFAULT '{}',
  initiative_ids uuid[] NOT NULL DEFAULT '{}',
  project_ids text[] NOT NULL DEFAULT '{}',
  research_ids text[] NOT NULL DEFAULT '{}',
  signal_ids text[] NOT NULL DEFAULT '{}',
  application_ids text[] NOT NULL DEFAULT '{}',
  metadata jsonb,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_execution_decisions_owner ON execution.decisions (owner_id, status);
CREATE INDEX idx_execution_decisions_deadline ON execution.decisions (deadline_at) WHERE status = 'open';

CREATE TABLE execution.decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES execution.decisions(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  chosen_option_id text NOT NULL,
  summary text NOT NULL,
  actual_impact text,
  success_rating smallint CHECK (success_rating BETWEEN 1 AND 5),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_execution_decision_outcomes_decision ON execution.decision_outcomes (decision_id);

CREATE TABLE execution.decision_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES execution.decisions(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'skipped')),
  notes text,
  outcome_assessment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_execution_decision_reviews_due ON execution.decision_reviews (owner_id, due_at) WHERE status = 'scheduled';

-- Seed default decisions aligned to existing goals/initiatives.
INSERT INTO execution.decisions (
  id, owner_id, title, question, rationale, category, domain_id, status, priority,
  confidence, options, deadline_at, goal_ids, initiative_ids, application_ids
) VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    '00000000-0000-0000-0000-000000000001',
    'Harvi growth strategy',
    'Increase Harvi marketing spend vs optimize fulfillment capacity?',
    'Weekly orders are below target; choose between demand generation and operational efficiency.',
    'business', 'ventures', 'open', 1,
    '{"score":0.72,"factors":["Linked to P1 weekly_orders goal","Harvi initiative active"]}'::jsonb,
    '[
      {"id":"opt-harvi-marketing","label":"Increase marketing spend","description":"Run targeted campaigns to drive order volume","pros":["Faster demand growth","Builds brand awareness"],"cons":["Higher CAC","Budget pressure"],"riskLevel":"medium","estimatedImpact":"+3-5 orders/week","recommended":true},
      {"id":"opt-harvi-ops","label":"Optimize fulfillment","description":"Improve ops capacity and delivery speed","pros":["Better margins","Higher retention"],"cons":["Slower top-line growth","Requires process changes"],"riskLevel":"low","estimatedImpact":"+1-2 orders/week retention"}
    ]'::jsonb,
    now() + interval '7 days',
    ARRAY['22222222-2222-2222-2222-222222222202']::uuid[],
    ARRAY['11111111-1111-1111-1111-111111111102']::uuid[],
    ARRAY['harvi-and-co']
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '00000000-0000-0000-0000-000000000001',
    'Portfolio mining exposure',
    'Rebalance mining exposure in portfolio?',
    'Net worth growth is behind quarterly target; mining sector volatility affects portfolio.',
    'financial', 'wealth', 'open', 2,
    '{"score":0.68,"factors":["Financial goal at 42% of target","Wealth context active"]}'::jsonb,
    '[
      {"id":"opt-rebalance-reduce","label":"Reduce mining exposure","description":"Trim mining holdings to reduce sector concentration","pros":["Lower volatility","Diversification"],"cons":["May miss upside","Tax implications"],"riskLevel":"medium","recommended":false},
      {"id":"opt-rebalance-hold","label":"Hold current allocation","description":"Maintain mining weight and monitor","pros":["No transaction costs","Stay positioned for recovery"],"cons":["Continued sector risk"],"riskLevel":"low","estimatedImpact":"Status quo"},
      {"id":"opt-rebalance-increase","label":"Increase mining exposure","description":"Add to mining on weakness","pros":["Potential upside if sector recovers"],"cons":["Higher concentration risk"],"riskLevel":"high","estimatedImpact":"Higher volatility"}
    ]'::jsonb,
    now() + interval '14 days',
    ARRAY['22222222-2222-2222-2222-222222222204']::uuid[],
    ARRAY['11111111-1111-1111-1111-111111111104']::uuid[],
    ARRAY['wealth']
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    '00000000-0000-0000-0000-000000000001',
    'TruAfrica launch pricing',
    'TruAfrica launch pricing: premium vs penetration?',
    'Launch readiness at 45%; pricing strategy affects market entry success.',
    'product', 'ventures', 'open', 2,
    '{"score":0.65,"factors":["Launch readiness goal active","Product category decision"]}'::jsonb,
    '[
      {"id":"opt-truafrica-premium","label":"Premium pricing","description":"Position as premium offering","pros":["Higher margins","Brand positioning"],"cons":["Slower adoption","Market resistance"],"riskLevel":"medium"},
      {"id":"opt-truafrica-penetration","label":"Penetration pricing","description":"Price aggressively for market share","pros":["Faster adoption","Competitive entry"],"cons":["Lower margins","Hard to raise later"],"riskLevel":"medium","recommended":true}
    ]'::jsonb,
    now() + interval '21 days',
    ARRAY['22222222-2222-2222-2222-222222222203']::uuid[],
    ARRAY['11111111-1111-1111-1111-111111111103']::uuid[],
    ARRAY['truafrica']
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    '00000000-0000-0000-0000-000000000001',
    'BellasOS roadmap priority',
    'Ship Decision Intelligence vs polish Today UX?',
    'Operational goal to ship intelligence layers; tradeoff between new capability and polish.',
    'operational', 'systems', 'open', 1,
    '{"score":0.7,"factors":["P1 operational goal","Build BellasOS initiative"]}'::jsonb,
    '[
      {"id":"opt-ship-decision","label":"Ship Decision Intelligence","description":"Deliver decision-aware Jarvis next","pros":["Strategic capability","Unlocks decision memory"],"cons":["Today UX gaps remain"],"riskLevel":"low","recommended":true},
      {"id":"opt-polish-today","label":"Polish Today UX","description":"Improve Today feed and cards first","pros":["Better daily experience","User-facing polish"],"cons":["Delays decision capability"],"riskLevel":"low"}
    ]'::jsonb,
    now() + interval '10 days',
    ARRAY['22222222-2222-2222-2222-222222222201']::uuid[],
    ARRAY['11111111-1111-1111-1111-111111111101']::uuid[],
    ARRAY['coding-studio']
  );

-- Seed one completed outcome for historical context.
INSERT INTO execution.decision_outcomes (
  id, decision_id, owner_id, chosen_option_id, summary, actual_impact, success_rating, recorded_at
) VALUES (
  '44444444-4444-4444-4444-444444444401',
  '33333333-3333-3333-3333-333333333304',
  '00000000-0000-0000-0000-000000000001',
  'opt-ship-goal',
  'Prioritized Goal Intelligence layer over UI polish',
  'Shipped goal-aware briefings on schedule',
  4,
  now() - interval '30 days'
);

-- Seed decision-goal links.
INSERT INTO execution.links (owner_id, type, from_id, to_id, confidence) VALUES
  ('00000000-0000-0000-0000-000000000001', 'decision_affects_goal', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202', 'explicit'),
  ('00000000-0000-0000-0000-000000000001', 'decision_affects_goal', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222204', 'explicit'),
  ('00000000-0000-0000-0000-000000000001', 'decision_affects_goal', '33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'explicit'),
  ('00000000-0000-0000-0000-000000000001', 'decision_affects_goal', '33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222201', 'explicit'),
  ('00000000-0000-0000-0000-000000000001', 'decision_informs_initiative', '33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111102', 'explicit');

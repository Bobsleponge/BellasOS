-- External integration accounts (social platforms, etc.)
CREATE TABLE IF NOT EXISTS core.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  module_id text NOT NULL,
  platform text NOT NULL,
  account_name text,
  status text NOT NULL DEFAULT 'connected',
  token_ref text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id, platform)
);

CREATE INDEX idx_integrations_module ON core.integrations (module_id, platform);
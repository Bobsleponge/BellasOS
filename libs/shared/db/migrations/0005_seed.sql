-- Baseline seed: permissions, roles, an admin user, and default AI providers.
INSERT INTO core.permissions (key, description) VALUES
  ('*', 'Full administrative access'),
  ('platform.admin', 'Administer the platform'),
  ('module.read', 'View modules'),
  ('module.manage', 'Install/enable/disable modules'),
  ('llm.read', 'View LLM models and usage'),
  ('llm.manage', 'Manage providers and models'),
  ('research.read', 'View research'),
  ('research.run', 'Run research tasks'),
  ('intelligence.read', 'View intelligence briefings'),
  ('intelligence.run', 'Run intelligence tasks'),
  ('portfolio.read', 'View portfolio'),
  ('portfolio.manage', 'Manage portfolio holdings'),
  ('social.read', 'View social content'),
  ('social.draft', 'Draft social content'),
  ('social.schedule', 'Schedule social content'),
  ('social.publish', 'Publish social content'),
  ('social.admin', 'Administer social integrations'),
  ('automation.read', 'View automation devices'),
  ('automation.control', 'Control automation devices'),
  ('voice.use', 'Use voice features'),
  ('camera.read', 'View camera events')
ON CONFLICT (key) DO NOTHING;

INSERT INTO core.roles (id, name, description) VALUES
  ('admin', 'Administrator', 'Full platform access'),
  ('operator', 'Operator', 'Run agents and manage modules'),
  ('viewer', 'Viewer', 'Read-only access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.role_permissions (role_id, permission_key) VALUES
  ('admin', '*')
ON CONFLICT DO NOTHING;

INSERT INTO core.role_permissions (role_id, permission_key)
SELECT 'operator', key FROM core.permissions
WHERE key IN (
  'module.read','module.manage','llm.read','research.read','research.run',
  'intelligence.read','intelligence.run','portfolio.read','social.read',
  'social.draft','social.schedule','automation.read','automation.control',
  'voice.use','camera.read'
)
ON CONFLICT DO NOTHING;

INSERT INTO core.role_permissions (role_id, permission_key)
SELECT 'viewer', key FROM core.permissions
WHERE key LIKE '%.read'
ON CONFLICT DO NOTHING;

INSERT INTO core.users (id, email, display_name, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@bellasos.local', 'BellasOS Admin', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO core.user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO ai.providers (id, name, type, status) VALUES
  ('openai', 'OpenAI', 'openai', 'enabled'),
  ('anthropic', 'Anthropic', 'anthropic', 'enabled'),
  ('google', 'Google', 'google', 'enabled'),
  ('deepseek', 'DeepSeek', 'deepseek', 'enabled'),
  ('ollama', 'Ollama (local)', 'ollama', 'enabled'),
  ('mock', 'Mock Provider', 'mock', 'enabled')
ON CONFLICT (id) DO NOTHING;

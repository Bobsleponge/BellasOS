import type { Generated } from 'kysely';

/**
 * Kysely database typing. Tables are referenced with their schema-qualified
 * names (e.g. `core.users`) to keep bounded contexts physically separated.
 */
export interface CoreUsersTable {
  id: Generated<string>;
  email: string;
  display_name: string;
  status: string;
  attributes: Record<string, unknown> | null;
  created_at: Generated<string>;
}

export interface CoreRolesTable {
  id: string;
  name: string;
  description: string;
}

export interface CorePermissionsTable {
  key: string;
  description: string;
}

export interface CoreRolePermissionsTable {
  role_id: string;
  permission_key: string;
}

export interface CoreUserRolesTable {
  user_id: string;
  role_id: string;
}

export interface CoreModulesTable {
  id: string;
  name: string;
  version: string;
  status: string;
  manifest: Record<string, unknown>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface CoreModuleSettingsTable {
  module_id: string;
  key: string;
  value: Record<string, unknown> | null;
  is_secret: boolean;
}

export interface CoreConfigTable {
  namespace: string;
  key: string;
  value: Record<string, unknown> | null;
  is_secret: boolean;
  secret_ref: string | null;
}

export interface CoreAuditLogTable {
  id: Generated<string>;
  actor_id: string | null;
  actor_type: string;
  action: string;
  target: string | null;
  outcome: string;
  trace_id: string;
  metadata: Record<string, unknown> | null;
  created_at: Generated<string>;
}

export interface CoreApprovalsTable {
  id: Generated<string>;
  actor_id: string;
  module_id: string;
  action: string;
  input: Record<string, unknown>;
  status: string;
  reason: string | null;
  resolver_id: string | null;
  trace_id: string;
  created_at: Generated<string>;
  resolved_at: string | null;
}

export interface CoreNotificationsTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  body: string;
  level: string;
  read: boolean;
  source: string;
  created_at: Generated<string>;
}

export interface AiProvidersTable {
  id: string;
  name: string;
  type: string;
  status: string;
  credentials_ref: string | null;
}

export interface AiModelsTable {
  id: string;
  provider_id: string;
  display_name: string;
  capabilities: string[];
  context_window: number;
  cost: Record<string, unknown>;
  local: boolean;
  enabled: boolean;
}

export interface AiUsageTable {
  id: Generated<string>;
  provider: string;
  model: string;
  task_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  actor_id: string | null;
  trace_id: string;
  created_at: Generated<string>;
}

export interface AiBenchmarksTable {
  id: Generated<string>;
  model: string;
  task_type: string;
  score: number;
  latency_ms: number;
  cost_usd: number;
  created_at: Generated<string>;
}

export interface AgentsAgentsTable {
  id: string;
  type: string;
  status: string;
  config: Record<string, unknown> | null;
}

export interface AgentsRunsTable {
  id: Generated<string>;
  agent_id: string;
  agent_type: string;
  task_id: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  trace_id: string;
  started_at: Generated<string>;
  finished_at: string | null;
}

export interface MemoryItemsTable {
  id: Generated<string>;
  tier: string;
  owner_id: string;
  content: string;
  tags: string[];
  source_ref: Record<string, unknown> | null;
  created_at: Generated<string>;
}

export interface MemorySummariesTable {
  id: Generated<string>;
  owner_id: string;
  tier: string;
  summary: string;
  created_at: Generated<string>;
}

export interface CoreIntegrationsTable {
  id: Generated<string>;
  user_id: string;
  module_id: string;
  platform: string;
  account_name: string | null;
  status: string;
  token_ref: string;
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ModuleKvTable {
  module_id: string;
  key: string;
  value: Record<string, unknown> | null;
}

export interface CoreIngestDocumentsTable {
  id: string;
  source: string;
  title: string;
  url: string | null;
  snippet: string;
  body: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  fetched_at: string;
  expires_at: string | null;
}

export interface Database {
  'core.users': CoreUsersTable;
  'core.roles': CoreRolesTable;
  'core.permissions': CorePermissionsTable;
  'core.role_permissions': CoreRolePermissionsTable;
  'core.user_roles': CoreUserRolesTable;
  'core.modules': CoreModulesTable;
  'core.module_settings': CoreModuleSettingsTable;
  'core.config': CoreConfigTable;
  'core.audit_log': CoreAuditLogTable;
  'core.approvals': CoreApprovalsTable;
  'core.notifications': CoreNotificationsTable;
  'core.integrations': CoreIntegrationsTable;
  'core.ingest_documents': CoreIngestDocumentsTable;
  'ai.providers': AiProvidersTable;
  'ai.models': AiModelsTable;
  'ai.usage': AiUsageTable;
  'ai.benchmarks': AiBenchmarksTable;
  'agents.agents': AgentsAgentsTable;
  'agents.runs': AgentsRunsTable;
  'memory.items': MemoryItemsTable;
  'memory.summaries': MemorySummariesTable;
  'core.module_kv': ModuleKvTable;
}

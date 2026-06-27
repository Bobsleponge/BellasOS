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

export interface JarvisSessionsTable {
  id: Generated<string>;
  user_id: string;
  title: string;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface JarvisMessagesTable {
  id: Generated<string>;
  session_id: string;
  role: string;
  content: string;
  created_at: Generated<string>;
}

export interface ExecutionInitiativesTable {
  id: Generated<string>;
  owner_id: string;
  name: string;
  description: string | null;
  status: string;
  momentum: string;
  organization_id: string | null;
  application_ids: string[];
  goal_ids: string[];
  project_ids: string[];
  priority: number;
  started_at: string | null;
  target_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExecutionGoalsTable {
  id: Generated<string>;
  owner_id: string;
  objective: string;
  category: string;
  domain_id: string;
  horizon: string;
  deadline_at: string | null;
  target: Record<string, unknown> | null;
  progress: Record<string, unknown>;
  priority: number;
  status: string;
  initiative_id: string | null;
  organization_id: string | null;
  application_ids: string[];
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExecutionLinksTable {
  id: Generated<string>;
  owner_id: string;
  type: string;
  from_id: string;
  to_id: string;
  confidence: string;
  metadata: Record<string, unknown> | null;
  created_at: Generated<string>;
}

export interface ExecutionDecisionsTable {
  id: Generated<string>;
  owner_id: string;
  title: string;
  question: string;
  rationale: string | null;
  category: string;
  domain_id: string;
  status: string;
  priority: number;
  confidence: Record<string, unknown> | null;
  options: Record<string, unknown>[];
  chosen_option_id: string | null;
  deadline_at: string | null;
  goal_ids: string[];
  initiative_ids: string[];
  project_ids: string[];
  research_ids: string[];
  signal_ids: string[];
  application_ids: string[];
  metadata: Record<string, unknown> | null;
  decided_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExecutionDecisionOutcomesTable {
  id: Generated<string>;
  decision_id: string;
  owner_id: string;
  chosen_option_id: string;
  summary: string;
  actual_impact: string | null;
  success_rating: number | null;
  recorded_at: Generated<string>;
}

export interface ExecutionDecisionReviewsTable {
  id: Generated<string>;
  decision_id: string;
  owner_id: string;
  due_at: string;
  status: string;
  notes: string | null;
  outcome_assessment: string | null;
  created_at: Generated<string>;
  completed_at: string | null;
}

export interface IntelligenceWorldEnrichmentsTable {
  id: Generated<string>;
  owner_id: string;
  ingest_doc_id: string;
  sector: string;
  relevance: Record<string, unknown>;
  opportunity: Record<string, unknown> | null;
  composite_score: number;
  goal_ids: string[];
  initiative_ids: string[];
  decision_ids: string[];
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface IntelligenceWorldTrendsTable {
  id: Generated<string>;
  owner_id: string;
  sector: string;
  direction: string;
  doc_count: number;
  window_hours: number;
  summary: string;
  confidence: number;
  linked_goal_ids: string[];
  created_at: Generated<string>;
}

export interface IntelligenceWorldSummariesTable {
  id: Generated<string>;
  owner_id: string;
  headline: string;
  sector: string;
  relevance_line: string | null;
  trend_direction: string | null;
  rhythm: string;
  created_at: Generated<string>;
}

export interface ExecutionWorkspacesTable {
  id: Generated<string>;
  owner_id: string;
  title: string;
  objective: string;
  type: string;
  status: string;
  domain_id: string;
  organization_id: string | null;
  application_ids: string[];
  goal_ids: string[];
  initiative_ids: string[];
  decision_ids: string[];
  artifact_ids: string[];
  research_ids: string[];
  memory_ids: string[];
  world_sector_tags: string[];
  keywords: string[];
  progress_summary: string | null;
  activated_at: string | null;
  archived_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface ExecutionFocusSessionsTable {
  id: Generated<string>;
  owner_id: string;
  workspace_id: string | null;
  focus_kind: string;
  focus_entity: Record<string, unknown> | null;
  jarvis_session_id: string | null;
  application_id: string | null;
  status: string;
  summary: string | null;
  started_at: Generated<string>;
  ended_at: string | null;
}

export interface ExecutionArtifactsTable {
  id: Generated<string>;
  owner_id: string;
  kind: string;
  title: string;
  summary: string | null;
  content_ref: Record<string, unknown> | null;
  workspace_ids: string[];
  goal_ids: string[];
  initiative_ids: string[];
  decision_ids: string[];
  application_ids: string[];
  memory_id: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
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
  'jarvis.sessions': JarvisSessionsTable;
  'jarvis.messages': JarvisMessagesTable;
  'core.module_kv': ModuleKvTable;
  'execution.initiatives': ExecutionInitiativesTable;
  'execution.goals': ExecutionGoalsTable;
  'execution.links': ExecutionLinksTable;
  'execution.decisions': ExecutionDecisionsTable;
  'execution.decision_outcomes': ExecutionDecisionOutcomesTable;
  'execution.decision_reviews': ExecutionDecisionReviewsTable;
  'intelligence.world_enrichments': IntelligenceWorldEnrichmentsTable;
  'intelligence.world_trends': IntelligenceWorldTrendsTable;
  'intelligence.world_summaries': IntelligenceWorldSummariesTable;
  'execution.workspaces': ExecutionWorkspacesTable;
  'execution.focus_sessions': ExecutionFocusSessionsTable;
  'execution.artifacts': ExecutionArtifactsTable;
}

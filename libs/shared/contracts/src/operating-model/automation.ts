/**
 * BellasOS automation architecture contracts.
 */

import type { ApprovalLevel } from './applications';

export const AUTOMATION_COMPONENTS = [
  'event',
  'trigger',
  'condition',
  'action',
  'approval',
  'workflow',
  'schedule',
  'background_intelligence',
] as const;

export type AutomationComponent = (typeof AUTOMATION_COMPONENTS)[number];

export interface AutomationEvent {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface AutomationTrigger {
  id: string;
  eventTypes: string[];
  schedule?: string;
}

export interface AutomationAction {
  capabilityId: string;
  applicationId: string;
  input?: Record<string, unknown>;
  approval: ApprovalLevel;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  state?: Record<string, unknown>;
}

export const AUTOMATION_EVENT_SOURCES = [
  'external_application_webhook',
  'external_application_poll',
  'ingestion_pipeline',
  'agent_completion',
  'environment_sensor',
  'user_lifecycle',
  'calendar_event',
  'graph_change',
] as const;

export const BACKGROUND_INTELLIGENCE_JOBS = [
  'feed_poll',
  'price_refresh',
  'briefing_generation',
  'integration_health_check',
  'alert_evaluation',
  'resource_ref_revalidation',
  'scheduled_publish',
] as const;

export const APPROVAL_MATRIX: Array<{
  actionClass: string;
  approval: ApprovalLevel;
}> = [
  { actionClass: 'read_financial_data', approval: 'none' },
  { actionClass: 'log_transaction', approval: 'confirm' },
  { actionClass: 'publish_social_content', approval: 'required' },
  { actionClass: 'control_home_device', approval: 'confirm' },
  { actionClass: 'write_venture_sor', approval: 'required' },
  { actionClass: 'create_or_delete_goal', approval: 'confirm' },
  { actionClass: 'create_or_delete_decision', approval: 'confirm' },
];

export const AUTOMATION_MEMORY_RULES = [
  'Background jobs write to working memory when output is ready for the user.',
  'Briefing and research outputs promote to knowledge memory.',
  'Significant automations may promote to episodic memory.',
  'Failed automations write to operations awareness unless user-relevant.',
] as const;

/**
 * BellasOS automation architecture contracts.
 */
import type { ApprovalLevel } from './applications';
export declare const AUTOMATION_COMPONENTS: readonly ["event", "trigger", "condition", "action", "approval", "workflow", "schedule", "background_intelligence"];
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
export declare const AUTOMATION_EVENT_SOURCES: readonly ["external_application_webhook", "external_application_poll", "ingestion_pipeline", "agent_completion", "environment_sensor", "user_lifecycle", "calendar_event", "graph_change"];
export declare const BACKGROUND_INTELLIGENCE_JOBS: readonly ["feed_poll", "price_refresh", "briefing_generation", "integration_health_check", "alert_evaluation", "resource_ref_revalidation", "scheduled_publish"];
export declare const APPROVAL_MATRIX: Array<{
    actionClass: string;
    approval: ApprovalLevel;
}>;
export declare const AUTOMATION_MEMORY_RULES: readonly ["Background jobs write to working memory when output is ready for the user.", "Briefing and research outputs promote to knowledge memory.", "Significant automations may promote to episodic memory.", "Failed automations write to operations awareness unless user-relevant."];
//# sourceMappingURL=automation.d.ts.map
"use strict";
/**
 * BellasOS automation architecture contracts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_MEMORY_RULES = exports.APPROVAL_MATRIX = exports.BACKGROUND_INTELLIGENCE_JOBS = exports.AUTOMATION_EVENT_SOURCES = exports.AUTOMATION_COMPONENTS = void 0;
exports.AUTOMATION_COMPONENTS = [
    'event',
    'trigger',
    'condition',
    'action',
    'approval',
    'workflow',
    'schedule',
    'background_intelligence',
];
exports.AUTOMATION_EVENT_SOURCES = [
    'external_application_webhook',
    'external_application_poll',
    'ingestion_pipeline',
    'agent_completion',
    'environment_sensor',
    'user_lifecycle',
    'calendar_event',
    'graph_change',
];
exports.BACKGROUND_INTELLIGENCE_JOBS = [
    'feed_poll',
    'price_refresh',
    'briefing_generation',
    'integration_health_check',
    'alert_evaluation',
    'resource_ref_revalidation',
    'scheduled_publish',
];
exports.APPROVAL_MATRIX = [
    { actionClass: 'read_financial_data', approval: 'none' },
    { actionClass: 'log_transaction', approval: 'confirm' },
    { actionClass: 'publish_social_content', approval: 'required' },
    { actionClass: 'control_home_device', approval: 'confirm' },
    { actionClass: 'write_venture_sor', approval: 'required' },
    { actionClass: 'create_or_delete_goal', approval: 'confirm' },
    { actionClass: 'create_or_delete_decision', approval: 'confirm' },
];
exports.AUTOMATION_MEMORY_RULES = [
    'Background jobs write to working memory when output is ready for the user.',
    'Briefing and research outputs promote to knowledge memory.',
    'Significant automations may promote to episodic memory.',
    'Failed automations write to operations awareness unless user-relevant.',
];
//# sourceMappingURL=automation.js.map
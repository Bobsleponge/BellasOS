"use strict";
/**
 * Goal and initiative types for BellasOS execution layer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTION_LINK_TYPES = exports.INITIATIVE_MOMENTUM = exports.INITIATIVE_STATUSES = exports.GOAL_PROGRESS_TRENDS = exports.GOAL_PRIORITIES = exports.GOAL_HORIZONS = exports.GOAL_STATUSES = exports.GOAL_CATEGORIES = void 0;
exports.GOAL_CATEGORIES = [
    'personal',
    'business',
    'financial',
    'project',
    'research',
    'learning',
    'operational',
];
exports.GOAL_STATUSES = ['active', 'paused', 'completed', 'abandoned'];
exports.GOAL_HORIZONS = ['weekly', 'monthly', 'quarterly', 'yearly', 'ongoing'];
exports.GOAL_PRIORITIES = [1, 2, 3, 4, 5];
exports.GOAL_PROGRESS_TRENDS = ['up', 'down', 'flat', 'unknown'];
exports.INITIATIVE_STATUSES = ['active', 'paused', 'completed'];
exports.INITIATIVE_MOMENTUM = [
    'accelerating',
    'steady',
    'slowing',
    'blocked',
];
exports.EXECUTION_LINK_TYPES = [
    'initiative_contains_goal',
    'goal_drives_project',
    'signal_affects_goal',
    'organization_owns_initiative',
    'organization_owns_goal',
    'decision_affects_goal',
    'decision_informs_initiative',
    'research_informs_decision',
    'signal_prompts_decision',
    'project_produces_decision',
    'decision_has_outcome',
    'insight_informs_decision',
    'workspace_contains_goal',
    'workspace_produces_artifact',
    'artifact_informs_decision',
    'session_focuses_workspace',
];
//# sourceMappingURL=goals.js.map
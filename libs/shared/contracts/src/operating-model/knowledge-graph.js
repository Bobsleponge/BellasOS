"use strict";
/**
 * BellasOS knowledge graph schema.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYER_ENTITY_TYPES = exports.GRAPH_QUERY_PATHS = exports.GRAPH_INTEGRITY_RULES = exports.GRAPH_LAYERS = void 0;
exports.GRAPH_LAYERS = [
    'identity',
    'execution',
    'cognitive',
    'wealth',
    'systems',
    'memory',
];
exports.GRAPH_INTEGRITY_RULES = [
    'Every external ResourceRef resolves to an Application capability for refresh.',
    'Insights must cite sources (research, briefing, or external ref).',
    'Decisions link forward to outcomes when results are known.',
    'Topics aggregate research, alerts, briefings, and memories.',
    'Graph is optimized for Jarvis reasoning, not human browsing.',
];
exports.GRAPH_QUERY_PATHS = [
    {
        id: 'wealth_exposure_decision',
        description: 'Should I increase exposure to a sector or asset class?',
        steps: [
            { nodeType: 'topic', edgeType: 'part_of' },
            { nodeType: 'briefing' },
            { nodeType: 'decision' },
            { nodeType: 'goal' },
            { nodeType: 'asset' },
        ],
    },
    {
        id: 'venture_project_blockers',
        description: 'What is blocking a venture project launch?',
        steps: [
            { nodeType: 'organization', edgeType: 'owns' },
            { nodeType: 'project', edgeType: 'contains' },
            { nodeType: 'task', edgeType: 'blocks' },
            { nodeType: 'task' },
        ],
    },
    {
        id: 'person_knowledge_profile',
        description: 'What do we know about a person or client?',
        steps: [
            { nodeType: 'person', edgeType: 'knows' },
            { nodeType: 'organization', edgeType: 'owns' },
            { nodeType: 'project' },
            { nodeType: 'research' },
        ],
    },
    {
        id: 'meeting_preparation',
        description: 'Prepare for a meeting with a person.',
        steps: [
            { nodeType: 'meeting', edgeType: 'contains' },
            { nodeType: 'person' },
            { nodeType: 'memory' },
            { nodeType: 'project' },
        ],
    },
];
exports.LAYER_ENTITY_TYPES = {
    identity: ['person', 'organization', 'role', 'relationship', 'membership', 'team'],
    execution: ['goal', 'initiative', 'decision', 'outcome', 'project', 'task', 'commitment', 'meeting', 'event'],
    cognitive: ['topic', 'research', 'document', 'note', 'briefing', 'alert', 'insight'],
    wealth: ['asset', 'liability', 'transaction', 'financial_snapshot', 'financial_decision'],
    systems: ['application', 'integration', 'capability', 'resource', 'resource_ref'],
    memory: ['memory'],
};
//# sourceMappingURL=knowledge-graph.js.map
"use strict";
/**
 * Canonical BellasOS relationship taxonomy for the knowledge graph.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATIONSHIP_RULES = exports.CORE_RELATIONSHIP_CONSTRAINTS = exports.RELATIONSHIPS_BY_CATEGORY = exports.RELATIONSHIP_TYPES = void 0;
exports.RELATIONSHIP_TYPES = [
    'owns',
    'contains',
    'part_of',
    'belongs_to',
    'drives',
    'informs',
    'produces',
    'affects',
    'blocks',
    'knows',
    'works_with',
    'reports_to',
    'represents',
    'serves',
    'records',
    'exposes',
    'references',
    'triggers',
    'requires_approval',
    'precedes',
    'supersedes',
    'scheduled_for',
    'has',
];
exports.RELATIONSHIPS_BY_CATEGORY = {
    structural: ['owns', 'contains', 'part_of', 'belongs_to'],
    causal: ['drives', 'informs', 'produces', 'affects', 'blocks'],
    social: ['knows', 'works_with', 'reports_to', 'represents'],
    operational: [
        'serves',
        'records',
        'exposes',
        'references',
        'triggers',
        'requires_approval',
    ],
    temporal: ['precedes', 'supersedes', 'scheduled_for'],
};
exports.CORE_RELATIONSHIP_CONSTRAINTS = [
    { from: 'organization', type: 'owns', to: 'project' },
    { from: 'organization', type: 'owns', to: 'goal' },
    { from: 'organization', type: 'owns', to: 'initiative' },
    { from: 'initiative', type: 'contains', to: 'goal' },
    { from: 'goal', type: 'drives', to: 'project' },
    { from: 'project', type: 'contains', to: 'task' },
    { from: 'project', type: 'produces', to: 'decision' },
    { from: 'decision', type: 'affects', to: 'goal' },
    { from: 'decision', type: 'has', to: 'outcome' },
    { from: 'research', type: 'informs', to: 'decision' },
    { from: 'briefing', type: 'informs', to: 'goal' },
    { from: 'research', type: 'part_of', to: 'topic' },
    { from: 'briefing', type: 'part_of', to: 'topic' },
    { from: 'alert', type: 'affects', to: 'topic' },
    { from: 'document', type: 'belongs_to', to: 'project' },
    { from: 'document', type: 'belongs_to', to: 'organization' },
    { from: 'application', type: 'exposes', to: 'capability' },
    { from: 'application', type: 'serves', to: 'organization' },
    { from: 'resource_ref', type: 'references', to: 'resource' },
    { from: 'resource', type: 'belongs_to', to: 'application' },
    { from: 'memory', type: 'references', to: 'person' },
    { from: 'memory', type: 'references', to: 'organization' },
    { from: 'memory', type: 'records', to: 'decision' },
    { from: 'automation', type: 'triggers', to: 'application' },
    { from: 'agent', type: 'references', to: 'application' },
    { from: 'meeting', type: 'contains', to: 'person' },
    { from: 'commitment', type: 'references', to: 'person' },
    { from: 'insight', type: 'informs', to: 'decision' },
    { from: 'financial_decision', type: 'affects', to: 'goal' },
    { from: 'financial_snapshot', type: 'belongs_to', to: 'organization' },
];
exports.RELATIONSHIP_RULES = [
    'Cross-domain links are encouraged.',
    'External relationships are cached with lastVerified - not authoritative in BellasOS.',
    'Edges carry confidence: explicit, inferred, or stale.',
    'Every insight, briefing, and promoted memory must link to at least one entity or topic.',
];
//# sourceMappingURL=relationships.js.map
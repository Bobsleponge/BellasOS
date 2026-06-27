"use strict";
/**
 * BellasOS memory classes - extends storage tiers with semantic memory types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_PHILOSOPHY = exports.MEMORY_FORGETTING_RULES = exports.MEMORY_PROMOTION_RULES = exports.MEMORY_CLASS_TO_TIER = exports.MEMORY_CLASSES = void 0;
exports.MEMORY_CLASSES = [
    'short_term',
    'working',
    'long_term',
    'knowledge',
    'decision',
    'relationship',
    'episodic',
    'procedural',
];
exports.MEMORY_CLASS_TO_TIER = {
    short_term: 'short',
    working: 'working',
    long_term: 'long',
    knowledge: 'long',
    decision: 'long',
    relationship: 'long',
    episodic: 'long',
    procedural: 'long',
};
exports.MEMORY_PROMOTION_RULES = [
    { from: 'short_term', to: 'working', trigger: 'relevant_to_active_day_or_thread' },
    { from: 'short_term', to: 'long_term', trigger: 'explicit_remember_command' },
    { from: 'working', to: 'long_term', trigger: 'reinforced_or_explicit_remember' },
    { from: 'working', to: 'decision', trigger: 'committed_choice_recorded' },
    { from: 'long_term', to: 'knowledge', trigger: 'synthesized_into_topic_profile' },
    { from: 'episodic', to: 'knowledge', trigger: 'compressed_after_retention_window' },
];
exports.MEMORY_FORGETTING_RULES = [
    { id: 'superseded', description: 'User or external system corrected outdated fact', action: 'stop_surfacing' },
    { id: 'expired_working', description: 'Working memory thread inactive beyond TTL', action: 'delete' },
    { id: 'low_confidence', description: 'Inferred memory never promoted', action: 'delete' },
    { id: 'explicit_delete', description: 'User requested forget', action: 'delete' },
    { id: 'privacy_boundary', description: 'Sensitivity tag blocks retention', action: 'delete' },
    { id: 'stale_external_ref', description: 'ResourceRef past freshness without revalidation', action: 'stop_surfacing' },
    { id: 'redundant_chat', description: 'Unpromoted verbatim conversation turns', action: 'delete' },
];
exports.MEMORY_PHILOSOPHY = {
    remember: [
        'preferences and working style',
        'decisions and rationale',
        'relationship facts',
        'synthesized insights',
        'conversation outcomes',
        'corrections and standing instructions',
        'goals commitments priorities',
    ],
    referenceInstead: [
        'full transaction history',
        'complete document contents',
        'authoritative financial records',
        'raw feed items',
        'every chat turn verbatim',
        'duplicate external data',
        'module configuration internals',
    ],
};
//# sourceMappingURL=memory-classes.js.map
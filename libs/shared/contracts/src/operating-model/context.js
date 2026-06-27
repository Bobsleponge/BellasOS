"use strict";
/**
 * BellasOS context stack - active frame for Jarvis intent resolution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTEXT_SIGNALS = exports.CONTEXT_SWITCHING_RULES = exports.CONTEXT_LAYERS = void 0;
exports.CONTEXT_LAYERS = [
    'session',
    'focus',
    'domain',
    'venture',
    'temporal',
    'modality',
    'location',
    'attention',
];
exports.CONTEXT_SWITCHING_RULES = [
    'Explicit signals override implicit signals.',
    'Entity mention promotes focus context.',
    'Context focus decays after inactivity unless pinned.',
    'Jarvis must be able to explain active context on request.',
    'Multi-venture context is allowed for comparison queries.',
];
exports.CONTEXT_SIGNALS = {
    explicit: [
        'user domain switch statements',
        'application focus',
        'entity reference in conversation',
    ],
    implicit: [
        'time of day',
        'recent agent runs',
        'pending approvals and alerts',
        'last accessed venture or project',
        'active automation state',
    ],
    persistent: [
        'identity preferences',
        'relationship context',
        'active goal hierarchy',
    ],
};
//# sourceMappingURL=context.js.map
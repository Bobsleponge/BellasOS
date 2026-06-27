"use strict";
/**
 * Focus sessions - what the user is working on right now.
 * Distinct from Jarvis chat sessions (jarvis.sessions).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOCUS_SESSION_STATUSES = exports.FOCUS_KINDS = void 0;
exports.FOCUS_KINDS = [
    'research',
    'project',
    'decision',
    'analysis',
    'planning',
    'general',
];
exports.FOCUS_SESSION_STATUSES = ['active', 'paused', 'ended'];
//# sourceMappingURL=sessions.js.map
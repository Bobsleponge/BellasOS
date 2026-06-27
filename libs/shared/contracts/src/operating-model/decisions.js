"use strict";
/**
 * Decision types for BellasOS execution layer and decision intelligence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECISION_REVIEW_STATUSES = exports.DECISION_RISK_LEVELS = exports.DECISION_STATUSES = exports.DECISION_CATEGORIES = void 0;
exports.DECISION_CATEGORIES = [
    'business',
    'financial',
    'product',
    'research',
    'operational',
    'personal',
];
exports.DECISION_STATUSES = [
    'open',
    'decided',
    'deferred',
    'superseded',
    'cancelled',
];
exports.DECISION_RISK_LEVELS = ['low', 'medium', 'high'];
exports.DECISION_REVIEW_STATUSES = ['scheduled', 'completed', 'skipped'];
//# sourceMappingURL=decisions.js.map
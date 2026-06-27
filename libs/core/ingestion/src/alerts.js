"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAlerts = evaluateAlerts;
function evaluateAlerts(rules, docs) {
    const matches = [];
    for (const rule of rules) {
        const sector = rule.sector.toLowerCase();
        const keyword = rule.keyword.toLowerCase();
        for (const doc of docs) {
            const hay = `${doc.title} ${doc.snippet} ${doc.body ?? ''} ${doc.tags.join(' ')}`.toLowerCase();
            if (hay.includes(sector) && hay.includes(keyword)) {
                matches.push({ rule, document: doc });
            }
        }
    }
    return matches;
}
//# sourceMappingURL=alerts.js.map
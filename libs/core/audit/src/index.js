"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'audit' });
/**
 * Append-only audit log. Writes to `core.audit_log` when the database is
 * available and always keeps a bounded in-memory tail for degraded mode and
 * fast dashboard reads.
 */
class AuditService {
    tail = [];
    maxTail = 500;
    async record(entry) {
        const enriched = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            actorType: entry.actorType ?? 'user',
            outcome: entry.outcome ?? 'ok',
        };
        this.tail.push(enriched);
        if (this.tail.length > this.maxTail)
            this.tail.shift();
        if (!(0, db_1.isDbAvailable)()) {
            log.debug('audit (memory)', { action: entry.action, outcome: enriched.outcome });
            return;
        }
        try {
            await (0, db_1.getDb)()
                .insertInto('core.audit_log')
                .values({
                actor_id: entry.actorId ?? null,
                actor_type: enriched.actorType ?? 'user',
                action: entry.action,
                target: entry.target ?? null,
                outcome: enriched.outcome ?? 'ok',
                trace_id: entry.traceId,
                metadata: entry.metadata ?? null,
            })
                .execute();
        }
        catch (err) {
            log.error('Failed to write audit entry', {
                error: err.message,
            });
        }
    }
    recent(limit = 50) {
        return this.tail.slice(-limit).reverse();
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=index.js.map
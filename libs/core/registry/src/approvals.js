"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const contracts_1 = require("@bellasos/contracts");
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'approvals' });
/**
 * Approval workflow service. Actions marked `requiresApproval` create a pending
 * approval and emit `approval.requested`; an authorised user resolves it,
 * emitting `approval.resolved`.
 */
class ApprovalService {
    events;
    memory = new Map();
    constructor(events) {
        this.events = events;
    }
    async request(input) {
        const approval = {
            id: crypto.randomUUID(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            ...input,
        };
        this.memory.set(approval.id, approval);
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('core.approvals')
                    .values({
                    id: approval.id,
                    actor_id: approval.actorId,
                    module_id: approval.moduleId,
                    action: approval.action,
                    input: approval.input,
                    status: 'pending',
                    trace_id: approval.traceId,
                    reason: null,
                    resolver_id: null,
                    resolved_at: null,
                })
                    .execute();
            }
            catch (err) {
                log.error('approval persist failed', {
                    error: err.message,
                });
            }
        }
        await this.events?.publish(contracts_1.CoreEvents.ApprovalRequested, approval, {
            traceId: approval.traceId,
            actorId: approval.actorId,
        });
        return approval;
    }
    async resolve(id, decision, resolverId, reason) {
        const approval = this.memory.get(id);
        if (approval) {
            approval.status = decision;
            approval.reason = reason;
        }
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .updateTable('core.approvals')
                    .set({
                    status: decision,
                    reason: reason ?? null,
                    resolver_id: resolverId,
                    resolved_at: new Date().toISOString(),
                })
                    .where('id', '=', id)
                    .execute();
            }
            catch (err) {
                log.error('approval resolve failed', {
                    error: err.message,
                });
            }
        }
        if (approval) {
            await this.events?.publish(contracts_1.CoreEvents.ApprovalResolved, approval, {
                traceId: approval.traceId,
                actorId: resolverId,
            });
        }
        return approval;
    }
    async pending() {
        return [...this.memory.values()].filter((a) => a.status === 'pending');
    }
    get(id) {
        return this.memory.get(id);
    }
}
exports.ApprovalService = ApprovalService;
//# sourceMappingURL=approvals.js.map
import type { EventBus } from '@bellasos/contracts';
export interface ApprovalRequest {
    id: string;
    actorId: string;
    moduleId: string;
    action: string;
    input: Record<string, unknown>;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    traceId: string;
    createdAt: string;
}
/**
 * Approval workflow service. Actions marked `requiresApproval` create a pending
 * approval and emit `approval.requested`; an authorised user resolves it,
 * emitting `approval.resolved`.
 */
export declare class ApprovalService {
    private readonly events?;
    private readonly memory;
    constructor(events?: EventBus | undefined);
    request(input: {
        actorId: string;
        moduleId: string;
        action: string;
        input: Record<string, unknown>;
        traceId: string;
    }): Promise<ApprovalRequest>;
    resolve(id: string, decision: 'approved' | 'rejected', resolverId: string, reason?: string): Promise<ApprovalRequest | undefined>;
    pending(): Promise<ApprovalRequest[]>;
    get(id: string): ApprovalRequest | undefined;
}
//# sourceMappingURL=approvals.d.ts.map
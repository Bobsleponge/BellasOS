import type { EventBus } from '@bellasos/contracts';
import { CoreEvents } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'approvals' });

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
export class ApprovalService {
  private readonly memory = new Map<string, ApprovalRequest>();

  constructor(private readonly events?: EventBus) {}

  async request(input: {
    actorId: string;
    moduleId: string;
    action: string;
    input: Record<string, unknown>;
    traceId: string;
  }): Promise<ApprovalRequest> {
    const approval: ApprovalRequest = {
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.memory.set(approval.id, approval);

    if (isDbAvailable()) {
      try {
        await getDb()
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
      } catch (err) {
        log.error('approval persist failed', {
          error: (err as Error).message,
        });
      }
    }

    await this.events?.publish(CoreEvents.ApprovalRequested, approval, {
      traceId: approval.traceId,
      actorId: approval.actorId,
    });
    return approval;
  }

  async resolve(
    id: string,
    decision: 'approved' | 'rejected',
    resolverId: string,
    reason?: string,
  ): Promise<ApprovalRequest | undefined> {
    const approval = this.memory.get(id);
    if (approval) {
      approval.status = decision;
      approval.reason = reason;
    }
    if (isDbAvailable()) {
      try {
        await getDb()
          .updateTable('core.approvals')
          .set({
            status: decision,
            reason: reason ?? null,
            resolver_id: resolverId,
            resolved_at: new Date().toISOString(),
          })
          .where('id', '=', id)
          .execute();
      } catch (err) {
        log.error('approval resolve failed', {
          error: (err as Error).message,
        });
      }
    }
    if (approval) {
      await this.events?.publish(CoreEvents.ApprovalResolved, approval, {
        traceId: approval.traceId,
        actorId: resolverId,
      });
    }
    return approval;
  }

  async pending(): Promise<ApprovalRequest[]> {
    return [...this.memory.values()].filter((a) => a.status === 'pending');
  }

  get(id: string): ApprovalRequest | undefined {
    return this.memory.get(id);
  }
}

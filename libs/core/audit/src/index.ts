import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'audit' });

export interface AuditEntryInput {
  actorId?: string | null;
  actorType?: string;
  action: string;
  target?: string | null;
  outcome?: 'ok' | 'denied' | 'error';
  traceId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntry extends AuditEntryInput {
  id: string;
  createdAt: string;
}

/**
 * Append-only audit log. Writes to `core.audit_log` when the database is
 * available and always keeps a bounded in-memory tail for degraded mode and
 * fast dashboard reads.
 */
export class AuditService {
  private readonly tail: AuditEntry[] = [];
  private readonly maxTail = 500;

  async record(entry: AuditEntryInput): Promise<void> {
    const enriched: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      actorType: entry.actorType ?? 'user',
      outcome: entry.outcome ?? 'ok',
    };
    this.tail.push(enriched);
    if (this.tail.length > this.maxTail) this.tail.shift();

    if (!isDbAvailable()) {
      log.debug('audit (memory)', { action: entry.action, outcome: enriched.outcome });
      return;
    }
    try {
      await getDb()
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
    } catch (err) {
      log.error('Failed to write audit entry', {
        error: (err as Error).message,
      });
    }
  }

  recent(limit = 50): AuditEntry[] {
    return this.tail.slice(-limit).reverse();
  }
}

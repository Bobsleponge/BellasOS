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
export declare class AuditService {
    private readonly tail;
    private readonly maxTail;
    record(entry: AuditEntryInput): Promise<void>;
    recent(limit?: number): AuditEntry[];
}
//# sourceMappingURL=index.d.ts.map
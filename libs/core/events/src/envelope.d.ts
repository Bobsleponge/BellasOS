import type { EventEnvelope } from '@bellasos/contracts';
export declare function buildEnvelope<T>(type: string, payload: T, source: string, options?: {
    traceId?: string;
    actorId?: string;
    version?: number;
}): EventEnvelope<T>;
//# sourceMappingURL=envelope.d.ts.map
import { randomUUID } from 'node:crypto';
import type { EventEnvelope } from '@bellasos/contracts';

export function buildEnvelope<T>(
  type: string,
  payload: T,
  source: string,
  options: { traceId?: string; actorId?: string; version?: number } = {},
): EventEnvelope<T> {
  return {
    id: randomUUID(),
    type,
    version: options.version ?? 1,
    source,
    traceId: options.traceId ?? randomUUID(),
    actorId: options.actorId,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

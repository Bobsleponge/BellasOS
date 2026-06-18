import { randomUUID } from 'node:crypto';

/** Generate a new trace id used to correlate a request across the platform. */
export function newTraceId(): string {
  return randomUUID();
}

/** Use the inbound trace header if present, else mint a fresh one. */
export function traceIdFrom(headerValue?: string | string[] | null): string {
  if (Array.isArray(headerValue)) return headerValue[0] ?? newTraceId();
  return headerValue ?? newTraceId();
}

export const TRACE_HEADER = 'x-trace-id';

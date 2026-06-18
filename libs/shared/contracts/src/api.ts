import type { ErrorCode } from './common';

/** Uniform response envelope returned by every REST endpoint. */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  traceId: string;
  timestamp: string;
  /** Cursor pagination metadata where applicable. */
  cursor?: { next?: string; hasMore: boolean };
}

export function ok<T>(data: T, traceId: string, cursor?: ApiMeta['cursor']): ApiResponse<T> {
  return {
    data,
    error: null,
    meta: { traceId, timestamp: new Date().toISOString(), cursor },
  };
}

export function fail(
  code: ErrorCode,
  message: string,
  traceId: string,
  details?: unknown,
): ApiResponse<never> {
  return {
    data: null,
    error: { code, message, details },
    meta: { traceId, timestamp: new Date().toISOString() },
  };
}

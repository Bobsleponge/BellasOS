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
    cursor?: {
        next?: string;
        hasMore: boolean;
    };
}
export declare function ok<T>(data: T, traceId: string, cursor?: ApiMeta['cursor']): ApiResponse<T>;
export declare function fail(code: ErrorCode, message: string, traceId: string, details?: unknown): ApiResponse<never>;
//# sourceMappingURL=api.d.ts.map
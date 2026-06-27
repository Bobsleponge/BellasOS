/** Generate a new trace id used to correlate a request across the platform. */
export declare function newTraceId(): string;
/** Use the inbound trace header if present, else mint a fresh one. */
export declare function traceIdFrom(headerValue?: string | string[] | null): string;
export declare const TRACE_HEADER = "x-trace-id";
//# sourceMappingURL=trace.d.ts.map
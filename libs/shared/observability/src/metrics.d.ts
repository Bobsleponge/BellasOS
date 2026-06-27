import { Counter, Histogram, Registry } from 'prom-client';
export declare const metricsRegistry: Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const httpRequests: Counter<"status" | "method" | "route">;
export declare const eventsPublished: Counter<"type">;
export declare const moduleActions: Counter<"action" | "module" | "outcome">;
export declare const aiRequests: Counter<"task" | "provider" | "model">;
export declare const aiCostUsd: Counter<"provider" | "model">;
export declare const aiLatency: Histogram<"provider" | "model">;
export declare function renderMetrics(): Promise<string>;
//# sourceMappingURL=metrics.d.ts.map
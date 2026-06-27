import type { EventBus, EventHandler, Subscription } from '@bellasos/contracts';
/**
 * In-process event bus used as a fallback when NATS is unavailable, and in
 * tests. Supports exact-match and wildcard (`domain.*`, `*`) subscriptions.
 */
export declare class InMemoryEventBus implements EventBus {
    private readonly source;
    private readonly handlers;
    constructor(source?: string);
    publish<T>(type: string, payload: T, options?: {
        traceId?: string;
        actorId?: string;
        version?: number;
    }): Promise<void>;
    subscribe<T>(type: string, handler: EventHandler<T>): Promise<Subscription>;
    private match;
}
//# sourceMappingURL=in-memory-bus.d.ts.map
import type { EventBus } from '@bellasos/contracts';
export interface EventBusConfig {
    natsUrl?: string;
    source?: string;
}
/**
 * Build an event bus, preferring NATS and gracefully falling back to the
 * in-process bus when NATS is not configured or unreachable.
 */
export declare function createEventBus(config: EventBusConfig): Promise<EventBus>;
//# sourceMappingURL=factory.d.ts.map
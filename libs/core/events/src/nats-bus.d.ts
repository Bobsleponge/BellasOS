import type { EventBus, EventHandler, Subscription } from '@bellasos/contracts';
/** NATS-backed event bus. Subjects follow `bellasos.<domain>.<entity>.<action>`. */
export declare class NatsEventBus implements EventBus {
    private readonly nc;
    private readonly source;
    private constructor();
    static connect(url: string, source?: string): Promise<NatsEventBus>;
    publish<T>(type: string, payload: T, options?: {
        traceId?: string;
        actorId?: string;
        version?: number;
    }): Promise<void>;
    subscribe<T>(type: string, handler: EventHandler<T>, options?: {
        queueGroup?: string;
    }): Promise<Subscription>;
    close(): Promise<void>;
}
//# sourceMappingURL=nats-bus.d.ts.map
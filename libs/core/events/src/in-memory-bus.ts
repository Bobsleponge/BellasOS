import type {
  EventBus,
  EventEnvelope,
  EventHandler,
  Subscription,
} from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { buildEnvelope } from './envelope';

const log = createLogger({ lib: 'events.memory' });

/**
 * In-process event bus used as a fallback when NATS is unavailable, and in
 * tests. Supports exact-match and wildcard (`domain.*`, `*`) subscriptions.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  constructor(private readonly source = 'bellasos') {}

  async publish<T>(
    type: string,
    payload: T,
    options: { traceId?: string; actorId?: string; version?: number } = {},
  ): Promise<void> {
    const envelope = buildEnvelope(type, payload, this.source, options);
    const matched = this.match(type);
    for (const handler of matched) {
      try {
        await handler(envelope as EventEnvelope);
      } catch (err) {
        log.error('Event handler failed', {
          type,
          error: (err as Error).message,
        });
      }
    }
  }

  async subscribe<T>(
    type: string,
    handler: EventHandler<T>,
  ): Promise<Subscription> {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler);
    return {
      type,
      unsubscribe: async () => {
        set?.delete(handler as EventHandler);
      },
    };
  }

  private match(type: string): EventHandler[] {
    const result: EventHandler[] = [];
    const [domain] = type.split('.');
    for (const [pattern, set] of this.handlers) {
      if (
        pattern === type ||
        pattern === '*' ||
        pattern === `${domain}.*`
      ) {
        result.push(...set);
      }
    }
    return result;
  }
}

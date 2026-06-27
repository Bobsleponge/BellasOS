import type { EventBus } from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { InMemoryEventBus } from './in-memory-bus';
import { NatsEventBus } from './nats-bus';

const log = createLogger({ lib: 'events.factory' });

export interface EventBusConfig {
  natsUrl?: string;
  source?: string;
}

/**
 * Build an event bus, preferring NATS and gracefully falling back to the
 * in-process bus when NATS is not configured or unreachable.
 */
export async function createEventBus(
  config: EventBusConfig,
): Promise<EventBus> {
  const source = config.source ?? 'bellasos';
  if (!config.natsUrl) {
    log.warn('NATS_URL not set; using in-process event bus');
    return new InMemoryEventBus(source);
  }
  try {
    return await NatsEventBus.connect(config.natsUrl, source);
  } catch (err) {
    log.warn('NATS unreachable; using in-process event bus', {
      error: (err as Error).message,
    });
    return new InMemoryEventBus(source);
  }
}

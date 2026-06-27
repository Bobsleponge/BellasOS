import {
  connect,
  JSONCodec,
  type NatsConnection,
  type Subscription as NatsSubscription,
} from 'nats';
import type {
  EventBus,
  EventEnvelope,
  EventHandler,
  Subscription,
} from '@bellasos/contracts';
import { subjectFor } from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { eventsPublished } from '@bellasos/observability';
import { buildEnvelope } from './envelope';

const log = createLogger({ lib: 'events.nats' });
const codec = JSONCodec<EventEnvelope>();

/** NATS-backed event bus. Subjects follow `bellasos.<domain>.<entity>.<action>`. */
export class NatsEventBus implements EventBus {
  private constructor(
    private readonly nc: NatsConnection,
    private readonly source: string,
  ) {}

  static async connect(url: string, source = 'bellasos'): Promise<NatsEventBus> {
    const nc = await connect({ servers: url, name: source });
    log.info('Connected to NATS', { url });
    return new NatsEventBus(nc, source);
  }

  async publish<T>(
    type: string,
    payload: T,
    options: { traceId?: string; actorId?: string; version?: number } = {},
  ): Promise<void> {
    const envelope = buildEnvelope(type, payload, this.source, options);
    this.nc.publish(subjectFor(type), codec.encode(envelope as EventEnvelope));
    eventsPublished.inc({ type });
  }

  async subscribe<T>(
    type: string,
    handler: EventHandler<T>,
    options: { queueGroup?: string } = {},
  ): Promise<Subscription> {
    // `*` and `domain.*` map onto NATS token wildcards.
    const subject =
      type === '*'
        ? 'bellasos.>'
        : type.endsWith('.*')
          ? `${subjectFor(type.slice(0, -2))}.>`
          : subjectFor(type);

    const sub: NatsSubscription = this.nc.subscribe(subject, {
      queue: options.queueGroup,
    });

    void (async () => {
      for await (const msg of sub) {
        try {
          const envelope = codec.decode(msg.data);
          await handler(envelope as EventEnvelope<T>);
        } catch (err) {
          log.error('NATS handler failed', {
            subject,
            error: (err as Error).message,
          });
        }
      }
    })();

    return {
      type,
      unsubscribe: async () => {
        sub.unsubscribe();
      },
    };
  }

  async close(): Promise<void> {
    await this.nc.drain();
  }
}

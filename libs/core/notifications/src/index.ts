import type { EventBus } from '@bellasos/contracts';
import { CoreEvents } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'notifications' });

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface NotificationInput {
  userId: string;
  title: string;
  body?: string;
  level?: NotificationLevel;
  source?: string;
}

export interface Notification extends Required<NotificationInput> {
  id: string;
  read: boolean;
  createdAt: string;
}

/** Creates user-facing notifications and emits `notification.created` events. */
export class NotificationService {
  private readonly memory: Notification[] = [];

  constructor(private readonly events?: EventBus) {}

  async create(input: NotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: input.userId,
      title: input.title,
      body: input.body ?? '',
      level: input.level ?? 'info',
      source: input.source ?? 'system',
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.memory.push(notification);
    if (this.memory.length > 500) this.memory.shift();

    if (isDbAvailable()) {
      try {
        await getDb()
          .insertInto('core.notifications')
          .values({
            user_id: notification.userId,
            title: notification.title,
            body: notification.body,
            level: notification.level,
            read: false,
            source: notification.source,
          })
          .execute();
      } catch (err) {
        log.error('notification persist failed', {
          error: (err as Error).message,
        });
      }
    }

    await this.events?.publish(CoreEvents.NotificationCreated, notification);
    return notification;
  }

  async list(userId: string, limit = 50): Promise<Notification[]> {
    return this.memory
      .filter((n) => n.userId === userId)
      .slice(-limit)
      .reverse();
  }
}

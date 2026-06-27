import Redis from 'ioredis';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'memory.short' });

/**
 * Short-term (conversation) memory. Uses Redis with a TTL when available and an
 * in-process map otherwise. Items can be promoted to long-term memory.
 */
export class ShortTermMemory {
  private redis?: Redis;
  private readonly fallback = new Map<string, { value: string; expires: number }>();
  private readonly ttlSeconds = 60 * 60; // 1 hour

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        this.redis.connect().catch((err) => {
          log.warn('Redis unreachable; short-term memory in-process', {
            error: (err as Error).message,
          });
          this.redis = undefined;
        });
      } catch {
        this.redis = undefined;
      }
    }
  }

  private key(ownerId: string): string {
    return `stm:${ownerId}`;
  }

  async append(ownerId: string, content: string): Promise<void> {
    if (this.redis) {
      await this.redis.rpush(this.key(ownerId), content);
      await this.redis.expire(this.key(ownerId), this.ttlSeconds);
      return;
    }
    const existing = this.fallback.get(this.key(ownerId));
    const value = existing ? `${existing.value}\n${content}` : content;
    this.fallback.set(this.key(ownerId), {
      value,
      expires: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async context(ownerId: string, limit = 20): Promise<string[]> {
    if (this.redis) {
      return this.redis.lrange(this.key(ownerId), -limit, -1);
    }
    const entry = this.fallback.get(this.key(ownerId));
    if (!entry || entry.expires < Date.now()) return [];
    return entry.value.split('\n').slice(-limit);
  }

  async clear(ownerId: string): Promise<void> {
    if (this.redis) await this.redis.del(this.key(ownerId));
    this.fallback.delete(this.key(ownerId));
  }
}

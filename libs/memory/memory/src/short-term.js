"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortTermMemory = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'memory.short' });
/**
 * Short-term (conversation) memory. Uses Redis with a TTL when available and an
 * in-process map otherwise. Items can be promoted to long-term memory.
 */
class ShortTermMemory {
    redis;
    fallback = new Map();
    ttlSeconds = 60 * 60; // 1 hour
    constructor(redisUrl) {
        if (redisUrl) {
            try {
                this.redis = new ioredis_1.default(redisUrl, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                });
                this.redis.connect().catch((err) => {
                    log.warn('Redis unreachable; short-term memory in-process', {
                        error: err.message,
                    });
                    this.redis = undefined;
                });
            }
            catch {
                this.redis = undefined;
            }
        }
    }
    key(ownerId) {
        return `stm:${ownerId}`;
    }
    async append(ownerId, content) {
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
    async context(ownerId, limit = 20) {
        if (this.redis) {
            return this.redis.lrange(this.key(ownerId), -limit, -1);
        }
        const entry = this.fallback.get(this.key(ownerId));
        if (!entry || entry.expires < Date.now())
            return [];
        return entry.value.split('\n').slice(-limit);
    }
    async clear(ownerId) {
        if (this.redis)
            await this.redis.del(this.key(ownerId));
        this.fallback.delete(this.key(ownerId));
    }
}
exports.ShortTermMemory = ShortTermMemory;
//# sourceMappingURL=short-term.js.map
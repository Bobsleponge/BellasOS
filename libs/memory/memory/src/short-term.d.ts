/**
 * Short-term (conversation) memory. Uses Redis with a TTL when available and an
 * in-process map otherwise. Items can be promoted to long-term memory.
 */
export declare class ShortTermMemory {
    private redis?;
    private readonly fallback;
    private readonly ttlSeconds;
    constructor(redisUrl?: string);
    private key;
    append(ownerId: string, content: string): Promise<void>;
    context(ownerId: string, limit?: number): Promise<string[]>;
    clear(ownerId: string): Promise<void>;
}
//# sourceMappingURL=short-term.d.ts.map
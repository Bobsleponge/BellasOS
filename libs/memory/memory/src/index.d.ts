import { type AIGateway, type MemoryGateway, type MemoryHit, type MemoryItem, type MemoryQuery, type MemoryTier, type MemoryWriteInput } from '@bellasos/contracts';
import { ShortTermMemory } from './short-term';
export * from './short-term';
export interface MemoryDeps {
    ai: AIGateway;
    redisUrl?: string;
}
/**
 * Three-tier memory system: short-term (Redis), working (Postgres) and
 * long-term (Postgres + pgvector). Long-term writes are embedded for semantic
 * recall. Degrades to in-memory stores when infrastructure is unavailable.
 */
export declare class MemorySystem implements MemoryGateway {
    private readonly deps;
    readonly short: ShortTermMemory;
    private readonly mem;
    constructor(deps: MemoryDeps);
    remember(input: MemoryWriteInput): Promise<MemoryItem>;
    recall(query: MemoryQuery): Promise<MemoryHit[]>;
    private recallLong;
    private recallKeyword;
    forget(id: string): Promise<void>;
    summarize(ownerId: string, tier: MemoryTier): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map
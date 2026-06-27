export type MemoryTier = 'short' | 'working' | 'long';
import type { MemoryClass } from './operating-model/memory-classes';
export type { MemoryClass } from './operating-model/memory-classes';
export interface MemoryItem {
    id: string;
    tier: MemoryTier;
    memoryClass?: MemoryClass;
    ownerId: string;
    content: string;
    tags: string[];
    sourceRef?: Record<string, unknown>;
    /** Entity IDs this memory is about (knowledge graph links). */
    about?: string[];
    domainId?: string;
    confidence?: 'explicit' | 'inferred' | 'imported';
    validFrom?: string;
    validUntil?: string;
    createdAt: string;
}
export interface MemoryWriteInput {
    tier: MemoryTier;
    memoryClass?: MemoryClass;
    ownerId: string;
    content: string;
    tags?: string[];
    sourceRef?: Record<string, unknown>;
    about?: string[];
    domainId?: string;
    confidence?: 'explicit' | 'inferred' | 'imported';
    validFrom?: string;
    validUntil?: string;
    /** When true (long tier), an embedding is generated for semantic search. */
    embed?: boolean;
}
export interface MemoryQuery {
    ownerId: string;
    query: string;
    tier?: MemoryTier;
    tags?: string[];
    limit?: number;
}
export interface MemoryHit extends MemoryItem {
    score: number;
}
/** Tiered memory surface handed to agents and modules via the module context. */
export interface MemoryGateway {
    remember(input: MemoryWriteInput): Promise<MemoryItem>;
    recall(query: MemoryQuery): Promise<MemoryHit[]>;
    forget(id: string): Promise<void>;
    summarize(ownerId: string, tier: MemoryTier): Promise<string>;
}
//# sourceMappingURL=memory.d.ts.map
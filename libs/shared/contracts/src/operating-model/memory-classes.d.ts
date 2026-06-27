/**
 * BellasOS memory classes - extends storage tiers with semantic memory types.
 */
import type { DomainId } from './domains';
import type { EntityRef } from './entities';
export type StorageTier = 'short' | 'working' | 'long';
export declare const MEMORY_CLASSES: readonly ["short_term", "working", "long_term", "knowledge", "decision", "relationship", "episodic", "procedural"];
export type MemoryClass = (typeof MEMORY_CLASSES)[number];
export declare const MEMORY_CLASS_TO_TIER: Record<MemoryClass, StorageTier>;
export type MemoryConfidence = 'explicit' | 'inferred' | 'imported';
export interface MemoryMetadata {
    memoryClass: MemoryClass;
    domainId?: DomainId;
    about: EntityRef[];
    sourceRef?: Record<string, unknown>;
    confidence: MemoryConfidence;
    validFrom?: string;
    validUntil?: string;
    sensitivity?: 'normal' | 'private' | 'restricted';
}
export interface MemoryPromotionRule {
    from: MemoryClass;
    to: MemoryClass;
    trigger: string;
}
export declare const MEMORY_PROMOTION_RULES: MemoryPromotionRule[];
export interface MemoryForgettingRule {
    id: string;
    description: string;
    action: 'delete' | 'stop_surfacing' | 'archive';
}
export declare const MEMORY_FORGETTING_RULES: MemoryForgettingRule[];
export declare const MEMORY_PHILOSOPHY: {
    readonly remember: readonly ["preferences and working style", "decisions and rationale", "relationship facts", "synthesized insights", "conversation outcomes", "corrections and standing instructions", "goals commitments priorities"];
    readonly referenceInstead: readonly ["full transaction history", "complete document contents", "authoritative financial records", "raw feed items", "every chat turn verbatim", "duplicate external data", "module configuration internals"];
};
export interface ExtendedMemoryWriteInput {
    ownerId: string;
    content: string;
    metadata: MemoryMetadata;
    tags?: string[];
    embed?: boolean;
}
//# sourceMappingURL=memory-classes.d.ts.map
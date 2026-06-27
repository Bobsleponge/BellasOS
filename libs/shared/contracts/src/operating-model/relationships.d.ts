/**
 * Canonical BellasOS relationship taxonomy for the knowledge graph.
 */
import type { EntityType } from './entities';
export declare const RELATIONSHIP_TYPES: readonly ["owns", "contains", "part_of", "belongs_to", "drives", "informs", "produces", "affects", "blocks", "knows", "works_with", "reports_to", "represents", "serves", "records", "exposes", "references", "triggers", "requires_approval", "precedes", "supersedes", "scheduled_for", "has"];
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type RelationshipCategory = 'structural' | 'causal' | 'social' | 'operational' | 'temporal';
export interface RelationshipEdge {
    id: string;
    type: RelationshipType;
    category: RelationshipCategory;
    from: {
        entityId: string;
        entityType: EntityType;
    };
    to: {
        entityId: string;
        entityType: EntityType;
    };
    confidence: 'explicit' | 'inferred' | 'stale';
    validFrom?: string;
    validUntil?: string;
    metadata?: Record<string, unknown>;
}
export declare const RELATIONSHIPS_BY_CATEGORY: Record<RelationshipCategory, RelationshipType[]>;
export declare const CORE_RELATIONSHIP_CONSTRAINTS: Array<{
    from: EntityType;
    type: RelationshipType;
    to: EntityType;
}>;
export declare const RELATIONSHIP_RULES: readonly ["Cross-domain links are encouraged.", "External relationships are cached with lastVerified - not authoritative in BellasOS.", "Edges carry confidence: explicit, inferred, or stale.", "Every insight, briefing, and promoted memory must link to at least one entity or topic."];
//# sourceMappingURL=relationships.d.ts.map
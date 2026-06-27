/**
 * BellasOS knowledge graph schema.
 */
import type { EntityType } from './entities';
import type { RelationshipType } from './relationships';
import type { MemoryClass } from './memory-classes';
export declare const GRAPH_LAYERS: readonly ["identity", "execution", "cognitive", "wealth", "systems", "memory"];
export type GraphLayer = (typeof GRAPH_LAYERS)[number];
export interface GraphNode {
    id: string;
    entityType: EntityType;
    layer: GraphLayer;
    name: string;
    properties?: Record<string, unknown>;
}
export interface GraphEdge {
    id: string;
    type: RelationshipType;
    fromId: string;
    toId: string;
    confidence: 'explicit' | 'inferred' | 'stale';
    weight?: number;
    validFrom?: string;
    validUntil?: string;
}
export interface GraphQueryPath {
    id: string;
    description: string;
    steps: Array<{
        nodeType: EntityType;
        edgeType?: RelationshipType;
    }>;
}
export declare const GRAPH_INTEGRITY_RULES: readonly ["Every external ResourceRef resolves to an Application capability for refresh.", "Insights must cite sources (research, briefing, or external ref).", "Decisions link forward to outcomes when results are known.", "Topics aggregate research, alerts, briefings, and memories.", "Graph is optimized for Jarvis reasoning, not human browsing."];
export declare const GRAPH_QUERY_PATHS: GraphQueryPath[];
export interface MemoryGraphNode {
    memoryId: string;
    memoryClass: MemoryClass;
    linkedEntityIds: string[];
}
export declare const LAYER_ENTITY_TYPES: Record<GraphLayer, EntityType[]>;
//# sourceMappingURL=knowledge-graph.d.ts.map
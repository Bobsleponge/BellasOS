/**
 * BellasOS agent catalog - domain specialists orchestrated by Jarvis.
 * Jarvis is the sole user-facing agent persona.
 */
import type { DomainId } from './domains';
import type { MemoryClass } from './memory-classes';
export declare const SPECIALIST_AGENT_IDS: readonly ["jarvis", "memory", "research", "intelligence", "wealth", "venture", "communications", "environment", "coding", "operations"];
export type SpecialistAgentId = (typeof SPECIALIST_AGENT_IDS)[number];
export interface AgentDefinition {
    id: SpecialistAgentId;
    name: string;
    userFacing: boolean;
    domainScope: DomainId[];
    knows: string[];
    owns: string[];
    applicationIds: string[];
    /** Maps to existing AgentType in agents pool where applicable. */
    legacyAgentType?: string;
}
export declare const AGENT_CATALOG: Record<SpecialistAgentId, AgentDefinition>;
export type AgentCollaborationPattern = 'sequential_handoff' | 'parallel_fan_out' | 'escalation' | 'human_in_loop';
export declare const AGENT_COLLABORATION_PATTERNS: Record<AgentCollaborationPattern, string>;
export type MemoryAccess = 'read' | 'write' | 'none';
export declare const AGENT_MEMORY_ACCESS: Record<MemoryClass, {
    read: SpecialistAgentId[];
    write: SpecialistAgentId[];
}>;
export declare const AGENT_OWNERSHIP_EXCLUSIONS: readonly ["Authoritative business records belong to venture applications.", "Financial ledger belongs to Finance Tracker.", "Graph identity belongs to BellasOS graph service.", "User-facing conversation persona belongs only to Jarvis."];
//# sourceMappingURL=agents.d.ts.map
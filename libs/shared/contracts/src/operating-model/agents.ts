/**
 * BellasOS agent catalog - domain specialists orchestrated by Jarvis.
 * Jarvis is the sole user-facing agent persona.
 */

import type { DomainId } from './domains';
import type { MemoryClass } from './memory-classes';

export const SPECIALIST_AGENT_IDS = [
  'jarvis',
  'memory',
  'research',
  'intelligence',
  'wealth',
  'venture',
  'communications',
  'environment',
  'coding',
  'operations',
] as const;

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

export const AGENT_CATALOG: Record<SpecialistAgentId, AgentDefinition> = {
  jarvis: {
    id: 'jarvis',
    name: 'Jarvis',
    userFacing: true,
    domainScope: [
      'identity',
      'relationships',
      'life',
      'ventures',
      'execution',
      'wealth',
      'knowledge',
      'intelligence',
      'communications',
      'environment',
      'systems',
      'automation',
    ],
    knows: [
      'context stack',
      'capability manifests',
      'agent catalog',
      'user preferences',
    ],
    owns: ['routing', 'conversation', 'approval presentation', 'orchestration'],
    applicationIds: [],
    legacyAgentType: 'orchestrator',
  },
  memory: {
    id: 'memory',
    name: 'Memory Agent',
    userFacing: false,
    domainScope: ['identity', 'relationships'],
    knows: ['memory classes', 'entity bindings', 'forgetting policies'],
    owns: ['memory promotion', 'memory demotion', 'forgetting'],
    applicationIds: [],
    legacyAgentType: 'memory',
  },
  research: {
    id: 'research',
    name: 'Research Agent',
    userFacing: false,
    domainScope: ['knowledge'],
    knows: ['research methods', 'topic graph'],
    owns: ['research runs', 'research reports'],
    applicationIds: ['research'],
    legacyAgentType: 'research',
  },
  intelligence: {
    id: 'intelligence',
    name: 'Intelligence Agent',
    userFacing: false,
    domainScope: ['intelligence'],
    knows: ['sector models', 'alert rules', 'briefing templates'],
    owns: ['briefings', 'alerts'],
    applicationIds: ['intelligence'],
    legacyAgentType: 'intelligence',
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth Agent',
    userFacing: false,
    domainScope: ['wealth'],
    knows: ['financial concepts', 'Finance Tracker capabilities'],
    owns: ['financial analysis - not ledger'],
    applicationIds: ['finance-tracker', 'portfolio'],
    legacyAgentType: 'finance',
  },
  venture: {
    id: 'venture',
    name: 'Venture Agent',
    userFacing: false,
    domainScope: ['ventures', 'execution'],
    knows: ['organization context', 'project semantics'],
    owns: ['cross-venture orchestration'],
    applicationIds: ['harvi-and-co', 'truafrica'],
    legacyAgentType: 'portfolio',
  },
  communications: {
    id: 'communications',
    name: 'Communications Agent',
    userFacing: false,
    domainScope: ['communications'],
    knows: ['platform rules', 'tone preferences'],
    owns: ['drafts', 'schedules'],
    applicationIds: ['communications'],
    legacyAgentType: 'social',
  },
  environment: {
    id: 'environment',
    name: 'Environment Agent',
    userFacing: false,
    domainScope: ['environment', 'automation'],
    knows: ['device models', 'home layout'],
    owns: ['device commands'],
    applicationIds: ['automation'],
    legacyAgentType: 'automation',
  },
  coding: {
    id: 'coding',
    name: 'Coding Agent',
    userFacing: false,
    domainScope: ['execution'],
    knows: ['build pipelines', 'artifact types'],
    owns: ['generated apps and games'],
    applicationIds: ['coding-studio'],
    legacyAgentType: 'coding',
  },
  operations: {
    id: 'operations',
    name: 'Operations Agent',
    userFacing: false,
    domainScope: ['systems'],
    knows: ['integration health', 'system status'],
    owns: ['diagnostics', 'planning'],
    applicationIds: [],
    legacyAgentType: 'operations',
  },
};

export type AgentCollaborationPattern =
  | 'sequential_handoff'
  | 'parallel_fan_out'
  | 'escalation'
  | 'human_in_loop';

export const AGENT_COLLABORATION_PATTERNS: Record<
  AgentCollaborationPattern,
  string
> = {
  sequential_handoff: 'Jarvis delegates to specialist, synthesizes, may write decision memory',
  parallel_fan_out: 'Jarvis fans out to multiple specialists and composes unified response',
  escalation: 'Specialist detects anomaly and invokes correlated specialist via Jarvis',
  human_in_loop: 'Specialist prepares action, Jarvis requests approval, executes on consent',
};

export type MemoryAccess = 'read' | 'write' | 'none';

export const AGENT_MEMORY_ACCESS: Record<
  MemoryClass,
  { read: SpecialistAgentId[]; write: SpecialistAgentId[] }
> = {
  short_term: {
    read: [...SPECIALIST_AGENT_IDS],
    write: [...SPECIALIST_AGENT_IDS],
  },
  working: {
    read: [...SPECIALIST_AGENT_IDS],
    write: [
      'jarvis',
      'memory',
      'research',
      'intelligence',
      'wealth',
      'venture',
      'communications',
      'environment',
      'coding',
    ],
  },
  long_term: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'memory'],
  },
  knowledge: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'memory', 'research', 'intelligence'],
  },
  decision: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'wealth', 'venture'],
  },
  relationship: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'memory', 'venture'],
  },
  episodic: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'memory'],
  },
  procedural: {
    read: [...SPECIALIST_AGENT_IDS],
    write: ['jarvis', 'memory'],
  },
};

export const AGENT_OWNERSHIP_EXCLUSIONS = [
  'Authoritative business records belong to venture applications.',
  'Financial ledger belongs to Finance Tracker.',
  'Graph identity belongs to BellasOS graph service.',
  'User-facing conversation persona belongs only to Jarvis.',
] as const;

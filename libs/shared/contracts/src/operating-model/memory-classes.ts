/**
 * BellasOS memory classes - extends storage tiers with semantic memory types.
 */

import type { DomainId } from './domains';
import type { EntityRef } from './entities';

export type StorageTier = 'short' | 'working' | 'long';

export const MEMORY_CLASSES = [
  'short_term',
  'working',
  'long_term',
  'knowledge',
  'decision',
  'relationship',
  'episodic',
  'procedural',
] as const;

export type MemoryClass = (typeof MEMORY_CLASSES)[number];

export const MEMORY_CLASS_TO_TIER: Record<MemoryClass, StorageTier> = {
  short_term: 'short',
  working: 'working',
  long_term: 'long',
  knowledge: 'long',
  decision: 'long',
  relationship: 'long',
  episodic: 'long',
  procedural: 'long',
};

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

export const MEMORY_PROMOTION_RULES: MemoryPromotionRule[] = [
  { from: 'short_term', to: 'working', trigger: 'relevant_to_active_day_or_thread' },
  { from: 'short_term', to: 'long_term', trigger: 'explicit_remember_command' },
  { from: 'working', to: 'long_term', trigger: 'reinforced_or_explicit_remember' },
  { from: 'working', to: 'decision', trigger: 'committed_choice_recorded' },
  { from: 'long_term', to: 'knowledge', trigger: 'synthesized_into_topic_profile' },
  { from: 'episodic', to: 'knowledge', trigger: 'compressed_after_retention_window' },
];

export interface MemoryForgettingRule {
  id: string;
  description: string;
  action: 'delete' | 'stop_surfacing' | 'archive';
}

export const MEMORY_FORGETTING_RULES: MemoryForgettingRule[] = [
  { id: 'superseded', description: 'User or external system corrected outdated fact', action: 'stop_surfacing' },
  { id: 'expired_working', description: 'Working memory thread inactive beyond TTL', action: 'delete' },
  { id: 'low_confidence', description: 'Inferred memory never promoted', action: 'delete' },
  { id: 'explicit_delete', description: 'User requested forget', action: 'delete' },
  { id: 'privacy_boundary', description: 'Sensitivity tag blocks retention', action: 'delete' },
  { id: 'stale_external_ref', description: 'ResourceRef past freshness without revalidation', action: 'stop_surfacing' },
  { id: 'redundant_chat', description: 'Unpromoted verbatim conversation turns', action: 'delete' },
];

export const MEMORY_PHILOSOPHY = {
  remember: [
    'preferences and working style',
    'decisions and rationale',
    'relationship facts',
    'synthesized insights',
    'conversation outcomes',
    'corrections and standing instructions',
    'goals commitments priorities',
  ],
  referenceInstead: [
    'full transaction history',
    'complete document contents',
    'authoritative financial records',
    'raw feed items',
    'every chat turn verbatim',
    'duplicate external data',
    'module configuration internals',
  ],
} as const;

export interface ExtendedMemoryWriteInput {
  ownerId: string;
  content: string;
  metadata: MemoryMetadata;
  tags?: string[];
  embed?: boolean;
}

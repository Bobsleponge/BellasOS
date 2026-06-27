/**
 * Canonical BellasOS entity model.
 */

import type { DomainId } from './domains';

export const ENTITY_TYPES = [
  'person',
  'relationship',
  'role',
  'organization',
  'team',
  'membership',
  'goal',
  'initiative',
  'decision',
  'outcome',
  'project',
  'task',
  'commitment',
  'meeting',
  'event',
  'topic',
  'research',
  'document',
  'note',
  'briefing',
  'alert',
  'insight',
  'asset',
  'liability',
  'transaction',
  'financial_snapshot',
  'financial_decision',
  'application',
  'integration',
  'capability',
  'resource',
  'resource_ref',
  'memory',
  'context',
  'session',
  'agent',
  'agent_run',
  'automation',
  'workflow',
  'approval',
  'workspace',
  'artifact',
  'work_session',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface EntityIdentity {
  id: string;
  type: EntityType;
  name: string;
  domainId: DomainId;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceRef {
  applicationId: string;
  resourceType: string;
  externalId: string;
  lastVerifiedAt?: string;
  uri?: string;
}

export interface ExternalEntity extends EntityIdentity {
  resourceRef: ResourceRef;
}

export type RelationshipConfidence = 'explicit' | 'inferred' | 'stale';

export interface EntityRef {
  entityId: string;
  entityType: EntityType;
}

export const BELLASOS_NATIVE_ENTITY_TYPES: EntityType[] = [
  'goal',
  'initiative',
  'decision',
  'outcome',
  'note',
  'memory',
  'topic',
  'insight',
  'commitment',
  'relationship',
  'role',
];

export const EXTERNAL_REFERENCE_ENTITY_TYPES: EntityType[] = [
  'asset',
  'liability',
  'transaction',
  'financial_snapshot',
  'resource',
  'resource_ref',
];

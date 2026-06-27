/**
 * BellasOS Application model - user-facing capability surfaces.
 */

import type { DomainId, FreshnessPolicy } from './domains';

export type ApplicationOwnership = 'external' | 'native' | 'hybrid';
export type CapabilityAccess = 'read' | 'write' | 'analyze' | 'publish' | 'automate';
export type ApprovalLevel = 'none' | 'confirm' | 'required';

export interface ApplicationCapability {
  id: string;
  name: string;
  description: string;
  access: CapabilityAccess;
  freshness: FreshnessPolicy;
  approval: ApprovalLevel;
  intentExamples?: string[];
  implementation?: { moduleId: string; action: string };
}

export interface ApplicationDefinition {
  id: string;
  name: string;
  ownership: ApplicationOwnership;
  description: string;
  primaryDomain: DomainId;
  secondaryDomains: DomainId[];
  organizationId?: string;
  systemOfRecord: boolean;
  integration: {
    type: 'api' | 'iframe' | 'webhook' | 'event_stream' | 'native';
    baseUrlEnv?: string;
    apiKeyEnv?: string;
    standaloneRoute?: string;
  };
  capabilities: ApplicationCapability[];
  moduleIds?: string[];
  /** Product semantics for Jarvis — account types, UX boundaries, common phrases. */
  jarvisGuide?: string;
  /** Alternate names users say when referring to this application. */
  aliases?: string[];
}

export interface ApplicationRegistryEntry extends ApplicationDefinition {
  status: 'registered' | 'connected' | 'disconnected' | 'degraded';
}

export interface ApplicationAwareness {
  applicationId: string;
  resourceRef?: { resourceType: string; externalId: string; lastVerifiedAt: string };
  snapshot?: { summary: string; capturedAt: string; ttlSeconds: number };
  syncState?: { lastSyncAt?: string; lastError?: string };
  capabilityState: Record<string, 'available' | 'unavailable' | 'degraded'>;
  healthState: 'healthy' | 'degraded' | 'offline';
}

/** Hints for OpenAI Lead — not hard routers. */
export interface AdvisoryPlaybook {
  id: string;
  domain: DomainId;
  applicationIds: string[];
  triggerExamples: string[];
  suggestedContextFetches: string[];
  requiredUserInputs: string[];
  optionalUserInputs?: string[];
  synthesisGuide: string;
}

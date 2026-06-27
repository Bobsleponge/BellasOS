/**
 * Canonical BellasOS domain vocabulary.
 * Domains are organizing lenses - not apps, modules, or screens.
 */

export const DOMAIN_IDS = [
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
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export type DomainTier = 'existential' | 'constructive' | 'cognitive' | 'operational';

export interface DomainDefinition {
  id: DomainId;
  name: string;
  tier: DomainTier;
  description: string;
  systemOfRecord?: string;
}

export const DOMAIN_DEFINITIONS: Record<DomainId, DomainDefinition> = {
  identity: {
    id: 'identity',
    name: 'Identity',
    tier: 'existential',
    description: 'Roles, preferences, values, working style, priorities, boundaries',
    systemOfRecord: 'bellasos',
  },
  relationships: {
    id: 'relationships',
    name: 'Relationships',
    tier: 'existential',
    description: 'People, roles they play, trust levels, communication norms',
    systemOfRecord: 'bellasos',
  },
  life: {
    id: 'life',
    name: 'Life',
    tier: 'existential',
    description: 'Personal routines, family, health, household, non-work commitments',
  },
  ventures: {
    id: 'ventures',
    name: 'Ventures',
    tier: 'constructive',
    description: 'Businesses you own or operate (Harvi and Co, TruAfrica, future ventures)',
  },
  execution: {
    id: 'execution',
    name: 'Execution',
    tier: 'constructive',
    description: 'Projects, tasks, deliverables, deadlines, commitments',
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth',
    tier: 'constructive',
    description: 'Net worth, cashflow, assets, liabilities, investments, financial decisions',
    systemOfRecord: 'finance-tracker',
  },
  knowledge: {
    id: 'knowledge',
    name: 'Knowledge',
    tier: 'cognitive',
    description: 'Notes, documents, research outputs, synthesized understanding',
    systemOfRecord: 'bellasos',
  },
  intelligence: {
    id: 'intelligence',
    name: 'Intelligence',
    tier: 'cognitive',
    description: 'External world signals - markets, sectors, news, alerts, briefings',
    systemOfRecord: 'bellasos',
  },
  communications: {
    id: 'communications',
    name: 'Communications',
    tier: 'cognitive',
    description: 'Messages, content, publishing, social presence, outreach',
  },
  environment: {
    id: 'environment',
    name: 'Environment',
    tier: 'operational',
    description: 'Home, devices, presence, physical context',
    systemOfRecord: 'home-assistant',
  },
  systems: {
    id: 'systems',
    name: 'Systems',
    tier: 'operational',
    description: 'Registered applications, integrations, capabilities, health, connectivity',
    systemOfRecord: 'bellasos',
  },
  automation: {
    id: 'automation',
    name: 'Automation',
    tier: 'operational',
    description: 'Triggers, workflows, scheduled intelligence, background actions',
    systemOfRecord: 'bellasos',
  },
};

export const DOMAINS_BY_TIER: Record<DomainTier, DomainId[]> = {
  existential: ['identity', 'relationships', 'life'],
  constructive: ['ventures', 'execution', 'wealth'],
  cognitive: ['knowledge', 'intelligence', 'communications'],
  operational: ['environment', 'systems', 'automation'],
};

export type FreshnessPolicy = 'live' | 'cached' | 'scheduled_sync';

export interface DomainBoundary {
  domainId: DomainId;
  ownerAppId?: string;
  intelligenceScope: string;
  actionScope: string;
  memoryScope: string;
  freshness: FreshnessPolicy;
}

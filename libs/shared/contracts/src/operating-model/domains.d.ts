/**
 * Canonical BellasOS domain vocabulary.
 * Domains are organizing lenses - not apps, modules, or screens.
 */
export declare const DOMAIN_IDS: readonly ["identity", "relationships", "life", "ventures", "execution", "wealth", "knowledge", "intelligence", "communications", "environment", "systems", "automation"];
export type DomainId = (typeof DOMAIN_IDS)[number];
export type DomainTier = 'existential' | 'constructive' | 'cognitive' | 'operational';
export interface DomainDefinition {
    id: DomainId;
    name: string;
    tier: DomainTier;
    description: string;
    systemOfRecord?: string;
}
export declare const DOMAIN_DEFINITIONS: Record<DomainId, DomainDefinition>;
export declare const DOMAINS_BY_TIER: Record<DomainTier, DomainId[]>;
export type FreshnessPolicy = 'live' | 'cached' | 'scheduled_sync';
export interface DomainBoundary {
    domainId: DomainId;
    ownerAppId?: string;
    intelligenceScope: string;
    actionScope: string;
    memoryScope: string;
    freshness: FreshnessPolicy;
}
//# sourceMappingURL=domains.d.ts.map
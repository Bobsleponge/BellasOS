/**
 * Jarvis application catalog — single source of truth for intent routing prompts.
 *
 * Adding a new app:
 * 1. Create a bridge module in libs/modules/<app> with actions
 * 2. Register in application-registry.json (capabilities, intentExamples, jarvisGuide)
 * 3. Add connect endpoint in apps/api if external
 * 4. Optional specialist agent in libs/agents/pool
 * 5. Jarvis picks it up automatically via buildJarvisApplicationCatalog()
 */
export declare function resolveRegistryApplicationId(applicationId?: string): string | undefined;
export interface JarvisCatalogOptions {
    /** Limit catalog to apps whose moduleIds intersect this set. */
    moduleIds?: string[];
}
export declare function buildJarvisApplicationCatalog(opts?: JarvisCatalogOptions): string;
export declare function buildSupplementalModuleHints(moduleIds: string[]): string;
export declare function resolveJarvisOpenAppIds(): string[];
export declare function formatApplicationContextForPrompt(applicationId?: string): string;
//# sourceMappingURL=jarvis-catalog.d.ts.map
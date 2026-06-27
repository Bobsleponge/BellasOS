import type { AdvisoryPlaybook, ApplicationDefinition } from './applications';
export declare const APPLICATION_REGISTRY: ApplicationDefinition[];
export declare const ADVISORY_PLAYBOOKS: AdvisoryPlaybook[];
export declare function getApplication(id: string): ApplicationDefinition | undefined;
export declare function getCapability(capabilityId: string): {
    application: ApplicationDefinition;
    capability: import("./applications").ApplicationCapability;
} | undefined;
export declare function getAdvisoryPlaybook(id: string): AdvisoryPlaybook | undefined;
export declare function listAdvisoryPlaybooks(): AdvisoryPlaybook[];
/** Maps legacy module / shell IDs to application registry IDs. */
export declare const LEGACY_APP_ID_MAP: Record<string, string>;
//# sourceMappingURL=application-registry.d.ts.map
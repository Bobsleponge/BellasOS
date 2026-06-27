import type { EventSpec } from '@bellasos/contracts';
/**
 * Central registry of every event type published/consumed across the platform.
 * Built from module/agent EventSpecs to power discovery, docs and contract
 * tests. Mismatched payloads can be validated against registered schemas.
 */
export declare class EventCatalog {
    private readonly specs;
    register(source: string, spec: EventSpec): void;
    registerMany(source: string, specs: EventSpec[]): void;
    describe(): Array<{
        type: string;
        specs: EventSpec[];
    }>;
    validate(type: string, payload: unknown): boolean;
}
//# sourceMappingURL=catalog.d.ts.map
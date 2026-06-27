import type { AICapability, ModelDescriptor } from '@bellasos/contracts';
export * from './catalog';
/**
 * Registry of available models. Supports register/enable/disable/version and
 * capability-based lookup used by the routing engine. Persists to `ai.models`
 * when the database is available; seeds from the default catalog otherwise.
 */
export declare class ModelRegistry {
    private readonly models;
    load(): Promise<void>;
    register(model: ModelDescriptor): void;
    enable(id: string): void;
    disable(id: string): void;
    get(id: string): ModelDescriptor | undefined;
    list(): ModelDescriptor[];
    enabled(): ModelDescriptor[];
    byCapability(cap: AICapability): ModelDescriptor[];
}
//# sourceMappingURL=index.d.ts.map
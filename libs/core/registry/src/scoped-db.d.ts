import type { ScopedDb } from '@bellasos/contracts';
/**
 * A module-private key/value store. Backed by `core.module_kv` keyed by module
 * id (a logical per-module namespace) with an in-memory fallback. No module can
 * read another module's keys.
 */
export declare class ModuleScopedDb implements ScopedDb {
    private readonly moduleId;
    private readonly memory;
    constructor(moduleId: string);
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    list<T = unknown>(prefix?: string): Promise<Array<{
        key: string;
        value: T;
    }>>;
}
//# sourceMappingURL=scoped-db.d.ts.map
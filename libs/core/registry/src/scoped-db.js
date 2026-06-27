"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleScopedDb = void 0;
const db_1 = require("@bellasos/db");
/**
 * A module-private key/value store. Backed by `core.module_kv` keyed by module
 * id (a logical per-module namespace) with an in-memory fallback. No module can
 * read another module's keys.
 */
class ModuleScopedDb {
    moduleId;
    memory = new Map();
    constructor(moduleId) {
        this.moduleId = moduleId;
    }
    async get(key) {
        if (!(0, db_1.isDbAvailable)())
            return this.memory.get(key);
        const row = await (0, db_1.getDb)()
            .selectFrom('core.module_kv')
            .select(['value'])
            .where('module_id', '=', this.moduleId)
            .where('key', '=', key)
            .executeTakeFirst();
        return row?.value ?? undefined;
    }
    async set(key, value) {
        this.memory.set(key, value);
        if (!(0, db_1.isDbAvailable)())
            return;
        await (0, db_1.getDb)()
            .insertInto('core.module_kv')
            .values({
            module_id: this.moduleId,
            key,
            value: value,
        })
            .onConflict((oc) => oc
            .columns(['module_id', 'key'])
            .doUpdateSet({ value: value }))
            .execute();
    }
    async delete(key) {
        this.memory.delete(key);
        if (!(0, db_1.isDbAvailable)())
            return;
        await (0, db_1.getDb)()
            .deleteFrom('core.module_kv')
            .where('module_id', '=', this.moduleId)
            .where('key', '=', key)
            .execute();
    }
    async list(prefix) {
        if (!(0, db_1.isDbAvailable)()) {
            return [...this.memory.entries()]
                .filter(([k]) => !prefix || k.startsWith(prefix))
                .map(([key, value]) => ({ key, value: value }));
        }
        let q = (0, db_1.getDb)()
            .selectFrom('core.module_kv')
            .select(['key', 'value'])
            .where('module_id', '=', this.moduleId);
        if (prefix)
            q = q.where('key', 'like', `${prefix}%`);
        const rows = await q.execute();
        return rows.map((r) => ({ key: r.key, value: r.value }));
    }
}
exports.ModuleScopedDb = ModuleScopedDb;
//# sourceMappingURL=scoped-db.js.map
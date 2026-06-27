import type { ScopedDb } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';

/**
 * A module-private key/value store. Backed by `core.module_kv` keyed by module
 * id (a logical per-module namespace) with an in-memory fallback. No module can
 * read another module's keys.
 */
export class ModuleScopedDb implements ScopedDb {
  private readonly memory = new Map<string, unknown>();

  constructor(private readonly moduleId: string) {}

  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (!isDbAvailable()) return this.memory.get(key) as T | undefined;
    const row = await getDb()
      .selectFrom('core.module_kv')
      .select(['value'])
      .where('module_id', '=', this.moduleId)
      .where('key', '=', key)
      .executeTakeFirst();
    return (row?.value as T) ?? undefined;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.memory.set(key, value);
    if (!isDbAvailable()) return;
    await getDb()
      .insertInto('core.module_kv')
      .values({
        module_id: this.moduleId,
        key,
        value: value as Record<string, unknown>,
      })
      .onConflict((oc) =>
        oc
          .columns(['module_id', 'key'])
          .doUpdateSet({ value: value as Record<string, unknown> }),
      )
      .execute();
  }

  async delete(key: string): Promise<void> {
    this.memory.delete(key);
    if (!isDbAvailable()) return;
    await getDb()
      .deleteFrom('core.module_kv')
      .where('module_id', '=', this.moduleId)
      .where('key', '=', key)
      .execute();
  }

  async list<T = unknown>(
    prefix?: string,
  ): Promise<Array<{ key: string; value: T }>> {
    if (!isDbAvailable()) {
      return [...this.memory.entries()]
        .filter(([k]) => !prefix || k.startsWith(prefix))
        .map(([key, value]) => ({ key, value: value as T }));
    }
    let q = getDb()
      .selectFrom('core.module_kv')
      .select(['key', 'value'])
      .where('module_id', '=', this.moduleId);
    if (prefix) q = q.where('key', 'like', `${prefix}%`);
    const rows = await q.execute();
    return rows.map((r) => ({ key: r.key, value: r.value as T }));
  }
}

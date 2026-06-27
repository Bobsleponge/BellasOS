import type { AICapability, ModelDescriptor } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';
import { DEFAULT_MODELS } from './catalog';

export * from './catalog';

const log = createLogger({ lib: 'ai.model-registry' });

/**
 * Registry of available models. Supports register/enable/disable/version and
 * capability-based lookup used by the routing engine. Persists to `ai.models`
 * when the database is available; seeds from the default catalog otherwise.
 */
export class ModelRegistry {
  private readonly models = new Map<string, ModelDescriptor>();

  async load(): Promise<void> {
    for (const m of DEFAULT_MODELS) this.models.set(m.id, m);
    if (isDbAvailable()) {
      try {
        const rows = await getDb().selectFrom('ai.models').selectAll().execute();
        for (const r of rows) {
          this.models.set(r.id, {
            id: r.id,
            provider: r.provider_id as ModelDescriptor['provider'],
            displayName: r.display_name,
            capabilities: r.capabilities as AICapability[],
            contextWindow: r.context_window,
            cost: r.cost as unknown as ModelDescriptor['cost'],
            local: r.local,
            enabled: r.enabled,
          });
        }
      } catch (err) {
        log.warn('model registry db load failed; using defaults', {
          error: (err as Error).message,
        });
      }
    }
    log.info('Model registry loaded', { count: this.models.size });
  }

  register(model: ModelDescriptor): void {
    this.models.set(model.id, model);
  }

  enable(id: string): void {
    const m = this.models.get(id);
    if (m) m.enabled = true;
  }

  disable(id: string): void {
    const m = this.models.get(id);
    if (m) m.enabled = false;
  }

  get(id: string): ModelDescriptor | undefined {
    return this.models.get(id);
  }

  list(): ModelDescriptor[] {
    return [...this.models.values()];
  }

  enabled(): ModelDescriptor[] {
    return this.list().filter((m) => m.enabled);
  }

  byCapability(cap: AICapability): ModelDescriptor[] {
    return this.enabled().filter((m) => m.capabilities.includes(cap));
  }
}

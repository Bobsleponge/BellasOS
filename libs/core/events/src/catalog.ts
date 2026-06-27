import type { EventSpec } from '@bellasos/contracts';

/**
 * Central registry of every event type published/consumed across the platform.
 * Built from module/agent EventSpecs to power discovery, docs and contract
 * tests. Mismatched payloads can be validated against registered schemas.
 */
export class EventCatalog {
  private readonly specs = new Map<string, EventSpec[]>();

  register(source: string, spec: EventSpec): void {
    const key = spec.type;
    const list = this.specs.get(key) ?? [];
    list.push(spec);
    this.specs.set(key, list);
  }

  registerMany(source: string, specs: EventSpec[]): void {
    for (const spec of specs) this.register(source, spec);
  }

  describe(): Array<{ type: string; specs: EventSpec[] }> {
    return [...this.specs.entries()].map(([type, specs]) => ({ type, specs }));
  }

  validate(type: string, payload: unknown): boolean {
    const specs = this.specs.get(type);
    if (!specs) return true; // unknown events are allowed (open system)
    const withSchema = specs.find((s) => s.schema);
    if (!withSchema?.schema) return true;
    return withSchema.schema.safeParse(payload).success;
  }
}

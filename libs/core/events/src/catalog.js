"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCatalog = void 0;
/**
 * Central registry of every event type published/consumed across the platform.
 * Built from module/agent EventSpecs to power discovery, docs and contract
 * tests. Mismatched payloads can be validated against registered schemas.
 */
class EventCatalog {
    specs = new Map();
    register(source, spec) {
        const key = spec.type;
        const list = this.specs.get(key) ?? [];
        list.push(spec);
        this.specs.set(key, list);
    }
    registerMany(source, specs) {
        for (const spec of specs)
            this.register(source, spec);
    }
    describe() {
        return [...this.specs.entries()].map(([type, specs]) => ({ type, specs }));
    }
    validate(type, payload) {
        const specs = this.specs.get(type);
        if (!specs)
            return true; // unknown events are allowed (open system)
        const withSchema = specs.find((s) => s.schema);
        if (!withSchema?.schema)
            return true;
        return withSchema.schema.safeParse(payload).success;
    }
}
exports.EventCatalog = EventCatalog;
//# sourceMappingURL=catalog.js.map
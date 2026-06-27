"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const catalog_1 = require("./catalog");
__exportStar(require("./catalog"), exports);
const log = (0, observability_1.createLogger)({ lib: 'ai.model-registry' });
/**
 * Registry of available models. Supports register/enable/disable/version and
 * capability-based lookup used by the routing engine. Persists to `ai.models`
 * when the database is available; seeds from the default catalog otherwise.
 */
class ModelRegistry {
    models = new Map();
    async load() {
        for (const m of catalog_1.DEFAULT_MODELS)
            this.models.set(m.id, m);
        if ((0, db_1.isDbAvailable)()) {
            try {
                const rows = await (0, db_1.getDb)().selectFrom('ai.models').selectAll().execute();
                for (const r of rows) {
                    this.models.set(r.id, {
                        id: r.id,
                        provider: r.provider_id,
                        displayName: r.display_name,
                        capabilities: r.capabilities,
                        contextWindow: r.context_window,
                        cost: r.cost,
                        local: r.local,
                        enabled: r.enabled,
                    });
                }
            }
            catch (err) {
                log.warn('model registry db load failed; using defaults', {
                    error: err.message,
                });
            }
        }
        log.info('Model registry loaded', { count: this.models.size });
    }
    register(model) {
        this.models.set(model.id, model);
    }
    enable(id) {
        const m = this.models.get(id);
        if (m)
            m.enabled = true;
    }
    disable(id) {
        const m = this.models.get(id);
        if (m)
            m.enabled = false;
    }
    get(id) {
        return this.models.get(id);
    }
    list() {
        return [...this.models.values()];
    }
    enabled() {
        return this.list().filter((m) => m.enabled);
    }
    byCapability(cap) {
        return this.enabled().filter((m) => m.capabilities.includes(cap));
    }
}
exports.ModelRegistry = ModelRegistry;
//# sourceMappingURL=index.js.map
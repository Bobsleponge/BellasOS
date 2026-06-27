"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventBus = void 0;
const observability_1 = require("@bellasos/observability");
const envelope_1 = require("./envelope");
const log = (0, observability_1.createLogger)({ lib: 'events.memory' });
/**
 * In-process event bus used as a fallback when NATS is unavailable, and in
 * tests. Supports exact-match and wildcard (`domain.*`, `*`) subscriptions.
 */
class InMemoryEventBus {
    source;
    handlers = new Map();
    constructor(source = 'bellasos') {
        this.source = source;
    }
    async publish(type, payload, options = {}) {
        const envelope = (0, envelope_1.buildEnvelope)(type, payload, this.source, options);
        const matched = this.match(type);
        for (const handler of matched) {
            try {
                await handler(envelope);
            }
            catch (err) {
                log.error('Event handler failed', {
                    type,
                    error: err.message,
                });
            }
        }
    }
    async subscribe(type, handler) {
        let set = this.handlers.get(type);
        if (!set) {
            set = new Set();
            this.handlers.set(type, set);
        }
        set.add(handler);
        return {
            type,
            unsubscribe: async () => {
                set?.delete(handler);
            },
        };
    }
    match(type) {
        const result = [];
        const [domain] = type.split('.');
        for (const [pattern, set] of this.handlers) {
            if (pattern === type ||
                pattern === '*' ||
                pattern === `${domain}.*`) {
                result.push(...set);
            }
        }
        return result;
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
//# sourceMappingURL=in-memory-bus.js.map
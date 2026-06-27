"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBus = createEventBus;
const observability_1 = require("@bellasos/observability");
const in_memory_bus_1 = require("./in-memory-bus");
const nats_bus_1 = require("./nats-bus");
const log = (0, observability_1.createLogger)({ lib: 'events.factory' });
/**
 * Build an event bus, preferring NATS and gracefully falling back to the
 * in-process bus when NATS is not configured or unreachable.
 */
async function createEventBus(config) {
    const source = config.source ?? 'bellasos';
    if (!config.natsUrl) {
        log.warn('NATS_URL not set; using in-process event bus');
        return new in_memory_bus_1.InMemoryEventBus(source);
    }
    try {
        return await nats_bus_1.NatsEventBus.connect(config.natsUrl, source);
    }
    catch (err) {
        log.warn('NATS unreachable; using in-process event bus', {
            error: err.message,
        });
        return new in_memory_bus_1.InMemoryEventBus(source);
    }
}
//# sourceMappingURL=factory.js.map
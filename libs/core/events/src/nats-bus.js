"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsEventBus = void 0;
const nats_1 = require("nats");
const contracts_1 = require("@bellasos/contracts");
const observability_1 = require("@bellasos/observability");
const observability_2 = require("@bellasos/observability");
const envelope_1 = require("./envelope");
const log = (0, observability_1.createLogger)({ lib: 'events.nats' });
const codec = (0, nats_1.JSONCodec)();
/** NATS-backed event bus. Subjects follow `bellasos.<domain>.<entity>.<action>`. */
class NatsEventBus {
    nc;
    source;
    constructor(nc, source) {
        this.nc = nc;
        this.source = source;
    }
    static async connect(url, source = 'bellasos') {
        const nc = await (0, nats_1.connect)({ servers: url, name: source });
        log.info('Connected to NATS', { url });
        return new NatsEventBus(nc, source);
    }
    async publish(type, payload, options = {}) {
        const envelope = (0, envelope_1.buildEnvelope)(type, payload, this.source, options);
        this.nc.publish((0, contracts_1.subjectFor)(type), codec.encode(envelope));
        observability_2.eventsPublished.inc({ type });
    }
    async subscribe(type, handler, options = {}) {
        // `*` and `domain.*` map onto NATS token wildcards.
        const subject = type === '*'
            ? 'bellasos.>'
            : type.endsWith('.*')
                ? `${(0, contracts_1.subjectFor)(type.slice(0, -2))}.>`
                : (0, contracts_1.subjectFor)(type);
        const sub = this.nc.subscribe(subject, {
            queue: options.queueGroup,
        });
        void (async () => {
            for await (const msg of sub) {
                try {
                    const envelope = codec.decode(msg.data);
                    await handler(envelope);
                }
                catch (err) {
                    log.error('NATS handler failed', {
                        subject,
                        error: err.message,
                    });
                }
            }
        })();
        return {
            type,
            unsubscribe: async () => {
                sub.unsubscribe();
            },
        };
    }
    async close() {
        await this.nc.drain();
    }
}
exports.NatsEventBus = NatsEventBus;
//# sourceMappingURL=nats-bus.js.map
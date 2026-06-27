"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEnvelope = buildEnvelope;
const node_crypto_1 = require("node:crypto");
function buildEnvelope(type, payload, source, options = {}) {
    return {
        id: (0, node_crypto_1.randomUUID)(),
        type,
        version: options.version ?? 1,
        source,
        traceId: options.traceId ?? (0, node_crypto_1.randomUUID)(),
        actorId: options.actorId,
        occurredAt: new Date().toISOString(),
        payload,
    };
}
//# sourceMappingURL=envelope.js.map
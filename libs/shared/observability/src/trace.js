"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACE_HEADER = void 0;
exports.newTraceId = newTraceId;
exports.traceIdFrom = traceIdFrom;
const node_crypto_1 = require("node:crypto");
/** Generate a new trace id used to correlate a request across the platform. */
function newTraceId() {
    return (0, node_crypto_1.randomUUID)();
}
/** Use the inbound trace header if present, else mint a fresh one. */
function traceIdFrom(headerValue) {
    if (Array.isArray(headerValue))
        return headerValue[0] ?? newTraceId();
    return headerValue ?? newTraceId();
}
exports.TRACE_HEADER = 'x-trace-id';
//# sourceMappingURL=trace.js.map
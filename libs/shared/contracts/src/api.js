"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
function ok(data, traceId, cursor) {
    return {
        data,
        error: null,
        meta: { traceId, timestamp: new Date().toISOString(), cursor },
    };
}
function fail(code, message, traceId, details) {
    return {
        data: null,
        error: { code, message, details },
        meta: { traceId, timestamp: new Date().toISOString() },
    };
}
//# sourceMappingURL=api.js.map
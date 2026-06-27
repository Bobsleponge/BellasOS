"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootLogger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const root = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
        paths: [
            'password',
            '*.password',
            'secret',
            '*.secret',
            'apiKey',
            '*.apiKey',
            'authorization',
            '*.authorization',
            'token',
            '*.token',
        ],
        censor: '[redacted]',
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
});
class PinoLogger {
    inner;
    constructor(inner) {
        this.inner = inner;
    }
    debug(msg, meta) {
        this.inner.debug(meta ?? {}, msg);
    }
    info(msg, meta) {
        this.inner.info(meta ?? {}, msg);
    }
    warn(msg, meta) {
        this.inner.warn(meta ?? {}, msg);
    }
    error(msg, meta) {
        this.inner.error(meta ?? {}, msg);
    }
    child(bindings) {
        return new PinoLogger(this.inner.child(bindings));
    }
}
function createLogger(bindings = {}) {
    return new PinoLogger(root.child(bindings));
}
exports.rootLogger = new PinoLogger(root);
//# sourceMappingURL=logger.js.map
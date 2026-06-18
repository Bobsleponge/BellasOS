"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BellasError = exports.ErrorCode = exports.dataClassificationSchema = exports.DataClassification = exports.isoDateTimeSchema = exports.uuidSchema = void 0;
exports.isBellasError = isBellasError;
const zod_1 = require("zod");
exports.uuidSchema = zod_1.z.string().uuid();
exports.isoDateTimeSchema = zod_1.z.string().datetime();
/** The data-sensitivity classification used by privacy-aware routing + audit. */
exports.DataClassification = {
    Public: 'public',
    Internal: 'internal',
    Confidential: 'confidential',
    Restricted: 'restricted',
};
exports.dataClassificationSchema = zod_1.z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
]);
/** Standard error codes surfaced across the platform (never leak internals). */
exports.ErrorCode = {
    Unauthenticated: 'UNAUTHENTICATED',
    AuthzDenied: 'AUTHZ_DENIED',
    ValidationFailed: 'VALIDATION_FAILED',
    NotFound: 'NOT_FOUND',
    Conflict: 'CONFLICT',
    ModuleDisabled: 'MODULE_DISABLED',
    ModuleNotFound: 'MODULE_NOT_FOUND',
    ActionNotFound: 'ACTION_NOT_FOUND',
    ApprovalRequired: 'APPROVAL_REQUIRED',
    RateLimited: 'RATE_LIMITED',
    ProviderError: 'PROVIDER_ERROR',
    Internal: 'INTERNAL',
};
/** A domain error that carries a stable, client-safe code. */
class BellasError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BellasError';
    }
}
exports.BellasError = BellasError;
function isBellasError(err) {
    return err instanceof BellasError;
}
//# sourceMappingURL=common.js.map
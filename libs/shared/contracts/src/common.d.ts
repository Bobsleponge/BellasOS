import { z } from 'zod';
/** Branded id helpers keep entity ids from being accidentally mixed up. */
export type Uuid = string;
export declare const uuidSchema: z.ZodString;
export declare const isoDateTimeSchema: z.ZodString;
/** The data-sensitivity classification used by privacy-aware routing + audit. */
export declare const DataClassification: {
    readonly Public: "public";
    readonly Internal: "internal";
    readonly Confidential: "confidential";
    readonly Restricted: "restricted";
};
export type DataClassification = (typeof DataClassification)[keyof typeof DataClassification];
export declare const dataClassificationSchema: z.ZodEnum<["public", "internal", "confidential", "restricted"]>;
/** Standard error codes surfaced across the platform (never leak internals). */
export declare const ErrorCode: {
    readonly Unauthenticated: "UNAUTHENTICATED";
    readonly AuthzDenied: "AUTHZ_DENIED";
    readonly ValidationFailed: "VALIDATION_FAILED";
    readonly NotFound: "NOT_FOUND";
    readonly Conflict: "CONFLICT";
    readonly ModuleDisabled: "MODULE_DISABLED";
    readonly ModuleNotFound: "MODULE_NOT_FOUND";
    readonly ActionNotFound: "ACTION_NOT_FOUND";
    readonly ApprovalRequired: "APPROVAL_REQUIRED";
    readonly RateLimited: "RATE_LIMITED";
    readonly ProviderError: "PROVIDER_ERROR";
    readonly Internal: "INTERNAL";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
/** A domain error that carries a stable, client-safe code. */
export declare class BellasError extends Error {
    readonly code: ErrorCode;
    readonly details?: unknown | undefined;
    constructor(code: ErrorCode, message: string, details?: unknown | undefined);
}
export declare function isBellasError(err: unknown): err is BellasError;
//# sourceMappingURL=common.d.ts.map
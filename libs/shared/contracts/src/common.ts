import { z } from 'zod';

/** Branded id helpers keep entity ids from being accidentally mixed up. */
export type Uuid = string;

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime();

/** The data-sensitivity classification used by privacy-aware routing + audit. */
export const DataClassification = {
  Public: 'public',
  Internal: 'internal',
  Confidential: 'confidential',
  Restricted: 'restricted',
} as const;
export type DataClassification =
  (typeof DataClassification)[keyof typeof DataClassification];

export const dataClassificationSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
]);

/** Standard error codes surfaced across the platform (never leak internals). */
export const ErrorCode = {
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
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** A domain error that carries a stable, client-safe code. */
export class BellasError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BellasError';
  }
}

export function isBellasError(err: unknown): err is BellasError {
  return err instanceof BellasError;
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BellasError,
  ErrorCode,
  fail,
  isBellasError,
} from '@bellasos/contracts';
import { createLogger, traceIdFrom, TRACE_HEADER } from '@bellasos/observability';

const log = createLogger({ lib: 'api.http' });

const STATUS_BY_CODE: Record<string, number> = {
  [ErrorCode.Unauthenticated]: 401,
  [ErrorCode.AuthzDenied]: 403,
  [ErrorCode.ValidationFailed]: 400,
  [ErrorCode.NotFound]: 404,
  [ErrorCode.ModuleNotFound]: 404,
  [ErrorCode.ActionNotFound]: 404,
  [ErrorCode.Conflict]: 409,
  [ErrorCode.ModuleDisabled]: 409,
  [ErrorCode.ApprovalRequired]: 202,
  [ErrorCode.RateLimited]: 429,
  [ErrorCode.ProviderError]: 502,
  [ErrorCode.Internal]: 500,
};

@Catch()
export class BellasExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ headers: Record<string, string> }>();
    const traceId = traceIdFrom(req.headers[TRACE_HEADER]);

    if (isBellasError(exception)) {
      const status = STATUS_BY_CODE[exception.code] ?? 400;
      res
        .status(status)
        .json(fail(exception.code, exception.message, traceId, exception.details));
      return;
    }

    if (exception instanceof HttpException) {
      res
        .status(exception.getStatus())
        .json(fail(ErrorCode.Internal, exception.message, traceId));
      return;
    }

    log.error('unhandled error', { error: (exception as Error)?.message });
    res
      .status(500)
      .json(fail(ErrorCode.Internal, 'Internal server error', traceId));
  }
}

export { BellasError };

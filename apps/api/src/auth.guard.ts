import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SYSTEM_PRINCIPAL, type Principal } from '@bellasos/contracts';
import { traceIdFrom, TRACE_HEADER } from '@bellasos/observability';
import { PLATFORM, type Platform } from './platform.token';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export interface AuthedRequest extends Request {
  principal: Principal;
  traceId: string;
}

/** Default principal used in dev mode when no token is supplied. */
const DEV_ADMIN: Principal = {
  ...SYSTEM_PRINCIPAL,
  id: '00000000-0000-0000-0000-000000000001',
  type: 'user',
  displayName: 'Dev Admin',
  roles: ['admin'],
  permissions: ['*'],
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PLATFORM) private readonly platform: Platform,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    req.traceId = traceIdFrom(req.headers[TRACE_HEADER]);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      req.principal = await this.platform.auth.authenticate(header.slice(7));
      return true;
    }

    if (isPublic) {
      req.principal = SYSTEM_PRINCIPAL;
      return true;
    }

    // Dev convenience: allow unauthenticated access as a dev admin.
    if ((process.env.AUTH_MODE ?? 'dev') === 'dev') {
      req.principal = DEV_ADMIN;
      return true;
    }

    req.principal = SYSTEM_PRINCIPAL;
    return isPublic ?? false;
  }
}

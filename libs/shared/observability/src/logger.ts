import pino from 'pino';
import type { Logger } from '@bellasos/contracts';

const root = pino({
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

class PinoLogger implements Logger {
  constructor(private readonly inner: pino.Logger) {}
  debug(msg: string, meta?: Record<string, unknown>): void {
    this.inner.debug(meta ?? {}, msg);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.inner.info(meta ?? {}, msg);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.inner.warn(meta ?? {}, msg);
  }
  error(msg: string, meta?: Record<string, unknown>): void {
    this.inner.error(meta ?? {}, msg);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new PinoLogger(this.inner.child(bindings));
  }
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return new PinoLogger(root.child(bindings));
}

export const rootLogger: Logger = new PinoLogger(root);

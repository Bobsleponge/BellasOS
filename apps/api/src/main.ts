import 'reflect-metadata';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { Platform } from '@bellasos/runtime';
import { createLogger, httpRequests } from '@bellasos/observability';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { warmupTranscriber } from './stt.service';

// Load monorepo root .env regardless of process cwd (e.g. Start-Process).
loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv();
const log = createLogger({ app: 'api' });

async function bootstrap(): Promise<void> {
  const platform = await Platform.create();
  const app = await NestFactory.create(AppModule.forRoot(platform), {
    logger: ['error', 'warn', 'log'],
  });

  const basePath = process.env.API_BASE_PATH ?? '/api/v1';
  app.setGlobalPrefix(basePath.replace(/^\//, ''));
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Lightweight request metric.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      httpRequests.inc({
        method: req.method,
        route: req.path,
        status: String(res.statusCode),
      });
    });
    next();
  });

  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);
  log.info(`BellasOS API listening on http://${host}:${port}${basePath}`);
  warmupTranscriber();
}

bootstrap().catch((err) => {
  log.error('API failed to start', { error: (err as Error).message });
  process.exit(1);
});

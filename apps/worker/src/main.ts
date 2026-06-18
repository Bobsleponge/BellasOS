import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Platform } from '@bellasos/runtime';
import { createLogger } from '@bellasos/observability';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv();
const log = createLogger({ app: 'worker' });

/**
 * Background worker: scheduled intelligence briefings and due social publishes.
 */
async function bootstrap(): Promise<void> {
  const platform = await Platform.create({ source: 'bellasos-worker' });
  log.info('BellasOS worker started', {
    agents: platform.orchestrator.listAgents(),
  });

  const runDailyBriefing = async () => {
    try {
      await platform.registry.dispatch(
        'bellasos.intelligence',
        'brief.generate',
        { cadence: 'daily' },
        {
          principal: { id: 'system', roles: ['admin'], permissions: ['*'] },
          traceId: crypto.randomUUID(),
        },
      );
      log.info('daily intelligence briefing generated');
    } catch (err) {
      log.warn('daily briefing failed', { error: (err as Error).message });
    }
  };

  const publishDueSocial = async () => {
    try {
      const result = await platform.registry.dispatch(
        'bellasos.social',
        'scheduled.publishDue',
        {},
        {
          principal: { id: 'system', roles: ['admin'], permissions: ['*'] },
          traceId: crypto.randomUUID(),
        },
      );
      log.info('social scheduled publish tick', { result });
    } catch (err) {
      log.warn('social publish tick failed', { error: (err as Error).message });
    }
  };

  setTimeout(runDailyBriefing, 10_000);
  setInterval(runDailyBriefing, 24 * 60 * 60 * 1000);

  setInterval(publishDueSocial, 60_000);

  const heartbeat = setInterval(() => log.debug('worker heartbeat'), 60_000);
  process.on('SIGTERM', () => {
    clearInterval(heartbeat);
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  log.error('Worker failed to start', { error: (err as Error).message });
  process.exit(1);
});

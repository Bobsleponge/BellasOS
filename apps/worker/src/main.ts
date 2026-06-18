import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Platform } from '@bellasos/runtime';
import { getIngestionService } from '@bellasos/core-ingestion';
import { createLogger } from '@bellasos/observability';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv();
const log = createLogger({ app: 'worker' });

const SYSTEM_CTX = {
  principal: { id: 'system', roles: ['admin'], permissions: ['*'] },
  traceId: crypto.randomUUID(),
};

/**
 * Background worker: feed polling, alert evaluation, intelligence briefings, social publish.
 */
async function bootstrap(): Promise<void> {
  const platform = await Platform.create({ source: 'bellasos-worker' });
  getIngestionService();
  log.info('BellasOS worker started', {
    agents: platform.orchestrator.listAgents(),
  });

  const pollMinutes = Number(process.env.INGEST_FEED_POLL_MINUTES ?? 30);

  const pollFeeds = async () => {
    try {
      const sectors = await platform.registry.dispatch(
        'bellasos.intelligence',
        'sectors.list',
        {},
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      ) as string[];
      const ingestion = getIngestionService();
      const result = await ingestion.runWorldCollection({ sectors: sectors.slice(0, 12) });
      log.info('world collection complete', result);

      const alerts = (await platform.registry.dispatch(
        'bellasos.intelligence',
        'alerts.list',
        {},
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      )) as Array<{ id: string; sector: string; keyword: string }>;

      const matches = await ingestion.runAlertEvaluation(alerts);
      for (const match of matches.slice(0, 10)) {
        await platform.notifications.create({
          userId: '00000000-0000-0000-0000-000000000001',
          title: `Alert: ${match.rule.sector} / ${match.rule.keyword}`,
          body: match.document.title,
          level: 'info',
          source: 'intelligence.alert',
        });
      }
      if (matches.length > 0) {
        log.info('alert matches', { count: matches.length });
      }
    } catch (err) {
      log.warn('feed poll failed', { error: (err as Error).message });
    }
  };

  const refreshPortfolioPrices = async () => {
    try {
      await platform.registry.dispatch(
        'bellasos.portfolio',
        'prices.refresh',
        {},
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      );
      log.info('portfolio prices refreshed');
    } catch (err) {
      log.warn('portfolio price refresh failed', { error: (err as Error).message });
    }
  };

  const syncPortfolioExternal = async () => {
    try {
      const status = (await platform.registry.dispatch(
        'bellasos.portfolio',
        'sync.status',
        {},
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      )) as { connected?: boolean };
      if (!status.connected) return;

      await platform.registry.dispatch(
        'bellasos.portfolio',
        'sync.pull',
        {},
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      );
      log.info('portfolio external sync completed');
    } catch (err) {
      log.warn('portfolio external sync failed', { error: (err as Error).message });
    }
  };

  const runDailyBriefing = async () => {
    try {
      await platform.registry.dispatch(
        'bellasos.intelligence',
        'brief.generate',
        { cadence: 'daily' },
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
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
        { ...SYSTEM_CTX, traceId: crypto.randomUUID() },
      );
      log.info('social scheduled publish tick', { result });
    } catch (err) {
      log.warn('social publish tick failed', { error: (err as Error).message });
    }
  };

  setTimeout(pollFeeds, 15_000);
  setInterval(pollFeeds, pollMinutes * 60 * 1000);

  setTimeout(refreshPortfolioPrices, 20_000);
  setInterval(refreshPortfolioPrices, 60 * 60 * 1000);

  setTimeout(syncPortfolioExternal, 45_000);
  setInterval(syncPortfolioExternal, 15 * 60 * 1000);

  setTimeout(runDailyBriefing, 30_000);
  setInterval(runDailyBriefing, 24 * 60 * 60 * 1000);

  setInterval(publishDueSocial, 60_000);

  const heartbeat = setInterval(() => log.debug('worker heartbeat'), 60_000);
  process.on('SIGTERM', () => {
    clearInterval(heartbeat);
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  log.error('worker failed', { error: (err as Error).message });
  process.exit(1);
});

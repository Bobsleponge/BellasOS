import { createLogger } from '@bellasos/observability';
import { fetchFinnhubSignals } from '../connectors/finnhub';
import { fetchForexRates, getDefaultForexPairs } from '../connectors/forex';
import { fetchNewsForTopic } from '../connectors/rss-news';
import { pollCuratedRssFeeds } from '../connectors/rss-feeds';
import { fetchRedditFeeds } from '../connectors/reddit';
import { fetchRecentSecFilings } from '../connectors/sec-edgar';
import { collectYahooFinance } from '../connectors/yahoo-finance';
import { DEFAULT_YAHOO_WATCHLIST } from '../feeds/default-feeds';
import { saveDocuments } from '../store';
import type { IngestDocument } from '../types';
import type { CollectorRunContext, CollectorRunResult, WorldCollector } from './types';

const log = createLogger({ lib: 'ingestion', module: 'collectors' });

function wrap(id: string, name: string, sectors: WorldCollector['sectors'], fn: (ctx: CollectorRunContext) => Promise<IngestDocument[]>): WorldCollector {
  return { id, name, sectors, collect: fn };
}

const DEFAULT_COLLECTORS: WorldCollector[] = [
  wrap('rss_feeds', 'RSS Feeds', ['macroeconomics', 'south_africa'], () => pollCuratedRssFeeds(5)),
  wrap('sector_news', 'Sector News', ['ai', 'technology', 'energy', 'mining', 'healthcare', 'markets'], async (ctx) => {
    const sectors = ctx.sectors ?? ['AI', 'Energy', 'Mining', 'Healthcare', 'Macroeconomics'];
    const all: IngestDocument[] = [];
    for (const sector of sectors.slice(0, 8)) {
      try {
        all.push(...(await fetchNewsForTopic(`${sector} news`, 6)));
      } catch (err) {
        log.warn('sector news failed', { sector, error: (err as Error).message });
      }
    }
    return all;
  }),
  wrap('yahoo_finance', 'Yahoo Finance', ['markets', 'user_investments'], (ctx) =>
    collectYahooFinance(ctx.symbols ?? DEFAULT_YAHOO_WATCHLIST),
  ),
  wrap('forex', 'Forex Rates', ['macroeconomics'], () =>
    fetchForexRates(getDefaultForexPairs(), ['world-collection']),
  ),
  wrap('sec_edgar', 'SEC Filings', ['user_investments', 'markets'], () => fetchRecentSecFilings(25)),
  wrap('reddit', 'Reddit Pulse', ['technology', 'ai', 'markets'], () => fetchRedditFeeds()),
  wrap('finnhub', 'Finnhub Signals', ['markets'], () => fetchFinnhubSignals()),
];

export class CollectorRegistry {
  private collectors: WorldCollector[];

  constructor(collectors: WorldCollector[] = DEFAULT_COLLECTORS) {
    this.collectors = collectors;
  }

  list(): WorldCollector[] {
    return [...this.collectors];
  }

  async runAll(ctx: CollectorRunContext = {}): Promise<{
    total: number;
    bySource: Record<string, number>;
    results: CollectorRunResult[];
  }> {
    const bySource: Record<string, number> = {};
    const results: CollectorRunResult[] = [];
    let total = 0;

    for (const collector of this.collectors) {
      try {
        const docs = await collector.collect(ctx);
        bySource[collector.id] = docs.length;
        total += docs.length;
        if (docs.length > 0) await saveDocuments(docs);
        results.push({ collectorId: collector.id, count: docs.length });
      } catch (err) {
        bySource[collector.id] = 0;
        results.push({
          collectorId: collector.id,
          count: 0,
          error: (err as Error).message,
        });
        log.warn('collector failed', { id: collector.id, error: (err as Error).message });
      }
    }

    return { total, bySource, results };
  }
}

export const defaultCollectorRegistry = new CollectorRegistry();

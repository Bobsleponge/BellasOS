import { createLogger } from '@bellasos/observability';
import { evaluateAlerts, type AlertMatch, type AlertRule } from './alerts';
import { fetchFinnhubSignals } from './connectors/finnhub';
import { refreshPortfolioPrices } from './connectors/market';
import { fetchNewsForTopic } from './connectors/rss-news';
import { pollCuratedRssFeeds } from './connectors/rss-feeds';
import { fetchRedditFeeds } from './connectors/reddit';
import { fetchRecentSecFilings } from './connectors/sec-edgar';
import { getConnectorStatuses } from './connectors/status';
import { fetchUrlText } from './connectors/url-fetch';
import { webSearch } from './connectors/web-search';
import { dedupeDocs, filterRelevantDocs } from './context-ranking';
import { defaultCollectorRegistry } from './collectors/registry';
import { detectForexQuery, fetchForexRates, formatForexSpokenReply, getDefaultForexPairs, pickPrimaryForexSymbols } from './connectors/forex';
import { collectYahooFinance } from './connectors/yahoo-finance';
import { DEFAULT_YAHOO_WATCHLIST } from './feeds/default-feeds';
import {
  docsToSourceRefs,
  formatDocsForPrompt,
  listRecent,
  saveDocuments,
} from './store';
import type { IngestConnectorStatus, IngestDocument, IngestSourceRef } from './types';

const log = createLogger({ lib: 'ingestion' });

export interface WorldCollectionResult {
  total: number;
  bySource: Record<string, number>;
  collectedAt: string;
}

export interface FastAnswer {
  reply: string;
  sources: IngestSourceRef[];
  dataAsOf: string;
}

export class IngestionService {
  private lastCollectionAt: string | null = null;

  async searchAndFetch(query: string, tags: string[] = [], maxResults = 5): Promise<IngestDocument[]> {
    const hits = await webSearch(query, tags, maxResults);
    await saveDocuments(hits);

    const enriched: IngestDocument[] = [...hits];
    for (const hit of hits.slice(0, 3)) {
      if (!hit.url) continue;
      try {
        const { title, body } = await fetchUrlText(hit.url);
        const doc: IngestDocument = {
          ...hit,
          id: crypto.randomUUID(),
          source: 'url_fetch',
          title,
          body,
          tags: [...hit.tags, 'fetched'],
        };
        enriched.push(doc);
        await saveDocuments([doc]);
      } catch (err) {
        log.debug('url fetch skipped', { url: hit.url, error: (err as Error).message });
      }
    }
    return enriched;
  }

  async pollSectorNews(sectors: string[]): Promise<IngestDocument[]> {
    const all: IngestDocument[] = [];
    for (const sector of sectors) {
      try {
        const docs = await fetchNewsForTopic(`${sector} news`, 6);
        await saveDocuments(docs);
        all.push(...docs);
      } catch (err) {
        log.warn('sector news poll failed', { sector, error: (err as Error).message });
      }
    }
    return all;
  }

  async refreshPrices(symbols: string[]): Promise<IngestDocument[]> {
    const docs = await refreshPortfolioPrices(symbols);
    await saveDocuments(docs);
    return docs;
  }

  async runWorldCollection(opts?: {
    sectors?: string[];
    symbols?: string[];
  }): Promise<WorldCollectionResult> {
    const { total, bySource } = await defaultCollectorRegistry.runAll({
      sectors: opts?.sectors ?? ['AI', 'Energy', 'Mining', 'Healthcare', 'Macroeconomics'],
      symbols: opts?.symbols ?? DEFAULT_YAHOO_WATCHLIST,
    });

    this.lastCollectionAt = new Date().toISOString();
    log.info('world collection complete', { total, bySource });

    return {
      total,
      bySource,
      collectedAt: this.lastCollectionAt,
    };
  }

  getStatus(): {
    connectors: IngestConnectorStatus[];
    lastCollectionAt: string | null;
  } {
    return {
      connectors: getConnectorStatuses(),
      lastCollectionAt: this.lastCollectionAt,
    };
  }

  async getStatusAsync(): Promise<{
    connectors: IngestConnectorStatus[];
    lastCollectionAt: string | null;
  }> {
    const recent = await listRecent({ limit: 1, sinceHours: 168 });
    return {
      connectors: getConnectorStatuses(),
      lastCollectionAt: this.lastCollectionAt ?? recent[0]?.fetchedAt ?? null,
    };
  }

  async tryFastAnswer(query: string): Promise<FastAnswer | null> {
    const forex = detectForexQuery(query);
    if (!forex) return null;

    const symbols = pickPrimaryForexSymbols(forex, query);
    const docs = await fetchForexRates(symbols, ['jarvis', 'fast']);
    const doc = docs[0];
    if (!doc?.metadata?.rate) return null;

    void saveDocuments([doc]);
    return {
      reply: formatForexSpokenReply(doc),
      sources: docsToSourceRefs([doc]),
      dataAsOf: doc.fetchedAt,
    };
  }

  async gatherTargetedContext(query: string, tags: string[] = []): Promise<IngestDocument[]> {
    const mergedTags = [...new Set([...tags, 'jarvis', 'live'])];
    const docs: IngestDocument[] = [];

    const forex = detectForexQuery(query);
    if (forex) {
      docs.push(...(await fetchForexRates(pickPrimaryForexSymbols(forex, query), mergedTags)));
      return docs;
    }

    if (/\b(stock|market|price|ticker|nasdaq|dow|s&p|shares)\b/i.test(query) && !forex) {
      docs.push(...(await collectYahooFinance(DEFAULT_YAHOO_WATCHLIST.slice(0, 8))));
    }

    if (/\b(filing|sec|insider|8-k|10-k|edgar)\b/i.test(query)) {
      docs.push(...(await fetchRecentSecFilings(10)));
    }

    if (/\b(reddit|social|sentiment|buzz)\b/i.test(query)) {
      docs.push(...(await fetchRedditFeeds()));
    }

    return docs;
  }

  async gatherLiveContext(query: string, tags: string[] = []): Promise<IngestDocument[]> {
    const mergedTags = [...new Set([...tags, 'jarvis', 'live'])];
    const targeted = await this.gatherTargetedContext(query, tags);
    const tasks: Array<Promise<IngestDocument[]>> = [
      Promise.resolve(targeted),
      webSearch(query, mergedTags, 4),
      fetchNewsForTopic(query, 5),
    ];

    if (!detectForexQuery(query) && /\b(stock|market|price|ticker|nasdaq|dow|s&p)\b/i.test(query)) {
      tasks.push(collectYahooFinance(DEFAULT_YAHOO_WATCHLIST.slice(0, 6)));
    }

    const batches = await Promise.allSettled(tasks);
    const docs: IngestDocument[] = [];
    for (const batch of batches) {
      if (batch.status === 'fulfilled') docs.push(...batch.value);
    }
    if (docs.length > 0) await saveDocuments(docs);
    return docs;
  }

  looksLikeGeneralQuestion(query: string): boolean {
    const q = query.trim();
    if (!q || q.length > 220) return false;
    if (detectForexQuery(q)) return false;
    return (
      /\?|^(what|who|when|where|why|how|which|is|are|was|were|do|does|did|can|could|tell me|define|explain)\b/i.test(
        q,
      ) || q.split(/\s+/).length <= 8
    );
  }

  /** Live lookup for prices, news, and time-sensitive facts — not static general knowledge. */
  needsLiveLookup(query: string): boolean {
    const q = query.toLowerCase();
    if (detectForexQuery(query)) return true;
    return /\b(today|right now|currently|current|latest|live|now|price|stock|market|ticker|nasdaq|dow|s&p|news|weather|score|rate|bitcoin|crypto|earnings|filing|sec\b|insider|just happened|this week|this month|breaking|headline)\b/i.test(
      q,
    );
  }

  async getContextForQuery(
    query: string,
    tags: string[] = [],
    opts?: { maxDocs?: number },
  ): Promise<{
    docs: IngestDocument[];
    promptBlock: string;
    sources: IngestSourceRef[];
    fetchedAt: string;
  }> {
    const maxDocs = opts?.maxDocs ?? 12;
    const forex = detectForexQuery(query);
    if (forex) {
      const docs = await fetchForexRates(pickPrimaryForexSymbols(forex, query), [...tags, 'jarvis']);
      const doc = docs[0];
      if (doc) {
        return {
          docs: [doc],
          promptBlock: formatDocsForPrompt([doc]),
          sources: docsToSourceRefs([doc]),
          fetchedAt: doc.fetchedAt,
        };
      }
    }

    const targeted = await this.gatherTargetedContext(query, tags);
    const onTopic: IngestDocument[] = [...targeted];
    const wantsLive = this.needsLiveLookup(query);
    const searchLimit = 3;

    if (wantsLive && onTopic.length < maxDocs) {
      const [search, news] = await Promise.allSettled([
        webSearch(query, [...tags, 'jarvis'], searchLimit),
        fetchNewsForTopic(query, 2),
      ]);
      if (search.status === 'fulfilled') onTopic.push(...search.value);
      if (news.status === 'fulfilled') onTopic.push(...news.value);
    }

    const docs = filterRelevantDocs(query, dedupeDocs(onTopic), maxDocs);
    if (targeted.length > 0) void saveDocuments(targeted);

    const fetchedAt = docs[0]?.fetchedAt ?? new Date().toISOString();
    return {
      docs,
      promptBlock: formatDocsForPrompt(docs),
      sources: docsToSourceRefs(docs),
      fetchedAt,
    };
  }

  async runAlertEvaluation(rules: AlertRule[]): Promise<AlertMatch[]> {
    const docs = await listRecent({ sinceHours: 24, limit: 100 });
    return evaluateAlerts(rules, docs);
  }

  listRecent(opts: Parameters<typeof listRecent>[0]) {
    return listRecent(opts);
  }
}

let singleton: IngestionService | null = null;

export function getIngestionService(): IngestionService {
  if (!singleton) singleton = new IngestionService();
  return singleton;
}

export { formatDocsForPrompt, docsToSourceRefs, saveDocuments, listRecent };
export type { IngestDocument, IngestSourceRef, AlertRule };
export type { AlertMatch } from './alerts';

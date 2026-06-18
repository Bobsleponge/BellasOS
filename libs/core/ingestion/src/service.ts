import { createLogger } from '@bellasos/observability';
import { evaluateAlerts, type AlertMatch, type AlertRule } from './alerts';
import { fetchNewsForTopic } from './connectors/rss-news';
import { refreshPortfolioPrices } from './connectors/market';
import { fetchUrlText } from './connectors/url-fetch';
import { webSearch } from './connectors/web-search';
import {
  docsToSourceRefs,
  formatDocsForPrompt,
  listRecent,
  saveDocuments,
} from './store';
import type { IngestDocument, IngestSourceRef } from './types';

const log = createLogger({ lib: 'ingestion' });

export class IngestionService {
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

  async getContextForQuery(query: string, tags: string[] = []): Promise<{
    docs: IngestDocument[];
    promptBlock: string;
    sources: IngestSourceRef[];
    fetchedAt: string;
  }> {
    const recent = await listRecent({ tags, limit: 10, sinceHours: 48 });
    let docs = recent;
    if (docs.length < 3) {
      docs = await this.searchAndFetch(query, tags, 5);
    }
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

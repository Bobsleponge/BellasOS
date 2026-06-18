import { DEFAULT_YAHOO_WATCHLIST } from '../feeds/default-feeds';
import { fetchForexRates, getDefaultForexPairs } from './forex';
import type { IngestDocument } from '../types';
import { fetchMarketQuote } from './market';

const UA = { 'user-agent': 'BellasOS/0.1 (data-ingestion)' };

async function yahooFinanceNews(symbols: string[], limit = 8): Promise<IngestDocument[]> {
  const docs: IngestDocument[] = [];
  const now = new Date().toISOString();
  const query = symbols.slice(0, 5).join(' OR ');

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=${limit}`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return docs;
    const json = (await res.json()) as {
      news?: Array<{ title?: string; link?: string; publisher?: string; providerPublishTime?: number }>;
    };
    for (const item of json.news ?? []) {
      if (!item.title) continue;
      docs.push({
        id: crypto.randomUUID(),
        source: 'yahoo_finance',
        title: item.title,
        url: item.link,
        snippet: item.publisher ? `Via ${item.publisher}` : 'Yahoo Finance news',
        tags: ['yahoo', 'finance', 'news', ...symbols.map((s) => s.toLowerCase())],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          publisher: item.publisher,
          publishedAt: item.providerPublishTime
            ? new Date(item.providerPublishTime * 1000).toISOString()
            : undefined,
        },
      });
    }
  } catch {
    /* skip */
  }
  return docs;
}

async function yahooTrending(limit = 15): Promise<IngestDocument[]> {
  const docs: IngestDocument[] = [];
  const now = new Date().toISOString();

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/trending/US?count=${limit}`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return docs;
    const json = (await res.json()) as {
      finance?: { result?: Array<{ quotes?: Array<{ symbol?: string; shortName?: string }> }> };
    };
    const quotes = json.finance?.result?.[0]?.quotes ?? [];
    for (const q of quotes) {
      if (!q.symbol) continue;
      docs.push({
        id: crypto.randomUUID(),
        source: 'yahoo_finance',
        title: `Trending: ${q.symbol}${q.shortName ? ` — ${q.shortName}` : ''}`,
        snippet: `Yahoo Finance trending ticker ${q.symbol}`,
        tags: ['yahoo', 'trending', 'market', q.symbol.toLowerCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        metadata: { symbol: q.symbol, trending: true },
      });
    }
  } catch {
    /* skip */
  }
  return docs;
}

export async function collectYahooFinance(symbols = DEFAULT_YAHOO_WATCHLIST): Promise<IngestDocument[]> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const docs: IngestDocument[] = [];

  for (const sym of unique) {
    try {
      const quote = await fetchMarketQuote(sym);
      if (quote) {
        docs.push({ ...quote, source: 'yahoo_finance', tags: [...quote.tags, 'yahoo'] });
      }
    } catch {
      /* skip symbol */
    }
  }

  docs.push(...(await yahooFinanceNews(unique)));
  docs.push(...(await yahooTrending()));
  docs.push(...(await fetchForexRates(getDefaultForexPairs(), ['yahoo', 'forex'])));
  return docs;
}

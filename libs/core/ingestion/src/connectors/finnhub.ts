import type { IngestDocument } from '../types';

export async function fetchFinnhubSignals(limit = 15): Promise<IngestDocument[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];

  const now = new Date().toISOString();
  const docs: IngestDocument[] = [];

  const endpoints = [
    { path: 'news?category=general', tags: ['finnhub', 'news', 'general'] },
    { path: 'news?category=forex', tags: ['finnhub', 'news', 'forex'] },
    { path: 'news?category=crypto', tags: ['finnhub', 'news', 'crypto'] },
  ];

  for (const ep of endpoints) {
    try {
      const url = `https://finnhub.io/api/v1/${ep.path}&token=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;

      const items = (await res.json()) as Array<{
        headline?: string;
        summary?: string;
        url?: string;
        source?: string;
        datetime?: number;
        category?: string;
      }>;

      for (const item of items.slice(0, Math.ceil(limit / endpoints.length))) {
        if (!item.headline) continue;
        docs.push({
          id: crypto.randomUUID(),
          source: 'finnhub',
          title: item.headline,
          url: item.url,
          snippet: item.summary ?? item.source ?? 'Finnhub market signal',
          tags: ep.tags,
          fetchedAt: now,
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            source: item.source,
            category: item.category,
            publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : undefined,
          },
        });
      }
    } catch {
      /* skip endpoint */
    }
  }

  return docs;
}

import type { IngestDocument } from '../types';

interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

async function searchTavily(query: string, maxResults: number): Promise<SearchHit[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  return (json.results ?? []).map((r) => ({
    title: r.title ?? r.url ?? query,
    url: r.url ?? '',
    snippet: r.content ?? '',
  }));
}

async function searchSerper(query: string, maxResults: number): Promise<SearchHit[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-API-KEY': key,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return (json.organic ?? []).map((r) => ({
    title: r.title ?? r.link ?? query,
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));
}

export async function webSearch(
  query: string,
  tags: string[] = [],
  maxResults = 5,
): Promise<IngestDocument[]> {
  const tavily = await searchTavily(query, maxResults);
  const hits = tavily.length > 0 ? tavily : await searchSerper(query, maxResults);

  const now = new Date().toISOString();
  return hits
    .filter((h) => h.url)
    .map((h) => ({
      id: crypto.randomUUID(),
      source: 'web_search' as const,
      title: h.title,
      url: h.url,
      snippet: h.snippet,
      tags: ['search', ...tags],
      fetchedAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { query },
    }));
}

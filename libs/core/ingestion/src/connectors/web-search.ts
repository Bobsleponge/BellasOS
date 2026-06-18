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

/** Free fallback when Tavily/Serper keys are not configured. */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchHit[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<
      | { Text?: string; FirstURL?: string }
      | { Name?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }
    >;
  };

  const hits: SearchHit[] = [];
  if (json.AbstractText?.trim()) {
    hits.push({
      title: json.Heading ?? query,
      url: json.AbstractURL ?? '',
      snippet: json.AbstractText.trim(),
    });
  }

  for (const topic of json.RelatedTopics ?? []) {
    if (hits.length >= maxResults) break;
    if ('Topics' in topic && Array.isArray(topic.Topics)) {
      for (const nested of topic.Topics) {
        if (hits.length >= maxResults) break;
        if (nested.Text) {
          hits.push({
            title: nested.Text.split(' - ')[0] ?? query,
            url: nested.FirstURL ?? '',
            snippet: nested.Text,
          });
        }
      }
      continue;
    }
    if ('Text' in topic && topic.Text) {
      hits.push({
        title: topic.Text.split(' - ')[0] ?? query,
        url: topic.FirstURL ?? '',
        snippet: topic.Text,
      });
    }
  }
  return hits.slice(0, maxResults);
}

/** Free Wikipedia summary fallback for factual questions. */
async function searchWikipedia(query: string): Promise<SearchHit[]> {
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    '&format=json&origin=*&srlimit=1';
  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(12_000) });
  if (!searchRes.ok) return [];
  const searchJson = (await searchRes.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };
  const title = searchJson.query?.search?.[0]?.title;
  if (!title) return [];

  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  if (!summaryRes.ok) return [];
  const summary = (await summaryRes.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  if (!summary.extract?.trim()) return [];
  return [
    {
      title: summary.title ?? title,
      url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      snippet: summary.extract.trim(),
    },
  ];
}

export async function webSearch(
  query: string,
  tags: string[] = [],
  maxResults = 5,
): Promise<IngestDocument[]> {
  const timeoutMs = Number(process.env.JARVIS_SEARCH_TIMEOUT_MS ?? 6_000);
  const tasks: Array<Promise<SearchHit[]>> = [];
  if (process.env.TAVILY_API_KEY) tasks.push(searchTavily(query, maxResults));
  if (process.env.SERPER_API_KEY) tasks.push(searchSerper(query, maxResults));
  tasks.push(searchDuckDuckGo(query, maxResults));
  tasks.push(searchWikipedia(query));

  const hits = await Promise.race([
    Promise.allSettled(tasks).then((results) => {
      const merged: SearchHit[] = [];
      const seen = new Set<string>();
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const hit of result.value) {
          const key = hit.url || hit.snippet.slice(0, 80);
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(hit);
        }
      }
      return merged.slice(0, maxResults);
    }),
    new Promise<SearchHit[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    }),
  ]);

  const now = new Date().toISOString();
  return hits
    .filter((h) => h.snippet.trim().length > 0 || h.url)
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

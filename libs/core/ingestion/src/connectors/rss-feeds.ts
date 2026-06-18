import { createLogger } from '@bellasos/observability';
import { getConfiguredRssFeeds } from '../feeds/default-feeds';
import type { IngestDocument } from '../types';

const log = createLogger({ lib: 'ingestion-rss-feeds' });

function parseRssItems(xml: string, limit: number): Array<{ title: string; link: string; snippet: string }> {
  const items: Array<{ title: string; link: string; snippet: string }> = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title =
      block
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<!\[CDATA\[|\]\]>/g, '')
        .trim() ?? '';
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? '';
    const desc =
      block
        .match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
        ?.replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .trim() ?? '';
    if (title) items.push({ title, link, snippet: desc.slice(0, 500) });
  }
  return items;
}

export async function pollCuratedRssFeeds(limitPerFeed = 6): Promise<IngestDocument[]> {
  const feeds = getConfiguredRssFeeds();
  const now = new Date().toISOString();
  const docs: IngestDocument[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'user-agent': 'BellasOS/0.1 (data-ingestion)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRssItems(xml, limitPerFeed)) {
        docs.push({
          id: crypto.randomUUID(),
          source: 'rss_feed',
          title: item.title,
          url: item.link || undefined,
          snippet: item.snippet,
          tags: ['rss', ...feed.tags],
          fetchedAt: now,
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { feedId: feed.id, feedName: feed.name, region: feed.region },
        });
      }
    } catch (err) {
      log.debug('rss feed poll skipped', { feed: feed.id, error: (err as Error).message });
    }
  }
  return docs;
}

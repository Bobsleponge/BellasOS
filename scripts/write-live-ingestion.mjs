import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');

const files = {
  'libs/core/ingestion/src/feeds/default-feeds.ts': `import type { IngestFeedDef } from '../types';

export const DEFAULT_RSS_FEEDS: IngestFeedDef[] = [
  { id: 'bbc-world', name: 'BBC World News', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', tags: ['news', 'world', 'bbc'], region: 'global' },
  { id: 'bbc-business', name: 'BBC Business', url: 'http://feeds.bbci.co.uk/news/business/rss.xml', tags: ['news', 'business', 'markets'], region: 'global' },
  { id: 'mining-com', name: 'Mining.com', url: 'https://www.mining.com/feed/', tags: ['mining', 'commodities'], region: 'global' },
  { id: 'oilprice', name: 'OilPrice.com', url: 'https://oilprice.com/rss/main', tags: ['energy', 'oil'], region: 'global' },
  { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', tags: ['crypto', 'markets'], region: 'global' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', tags: ['tech', 'ai'], region: 'global' },
  { id: 'moneyweb-sa', name: 'Moneyweb SA', url: 'https://www.moneyweb.co.za/feed/', tags: ['south-africa', 'finance'], region: 'za' },
];

export function getConfiguredRssFeeds(): IngestFeedDef[] {
  const extra = process.env.INGEST_RSS_URLS;
  const custom: IngestFeedDef[] = [];
  if (extra) {
    for (const raw of extra.split(',')) {
      const url = raw.trim();
      if (!url) continue;
      custom.push({ id: \`custom-\${url.length}\`, name: url, url, tags: ['custom', 'rss'] });
    }
  }
  return [...DEFAULT_RSS_FEEDS, ...custom];
}

export const DEFAULT_REDDIT_SUBS = (process.env.INGEST_REDDIT_SUBS ?? 'worldnews,investing,stocks,energy,mining,artificial')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const DEFAULT_YAHOO_WATCHLIST = (process.env.INGEST_YAHOO_SYMBOLS ?? 'SPY,QQQ,GLD,USO,BHP,RIO,NVDA,AAPL,MSFT')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
`,
};

for (const [rel, content] of Object.entries(files)) {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
  console.log('wrote', rel);
}

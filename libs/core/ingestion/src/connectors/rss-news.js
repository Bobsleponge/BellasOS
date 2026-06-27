"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNewsForTopic = fetchNewsForTopic;
function parseRssItems(xml, limit) {
    const items = [];
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    for (const block of blocks.slice(0, limit)) {
        const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? '';
        const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? '';
        const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').trim() ?? '';
        if (title)
            items.push({ title, link, snippet: desc.slice(0, 500) });
    }
    return items;
}
async function newsApiSearch(query, limit) {
    const key = process.env.NEWSAPI_KEY;
    if (!key)
        return [];
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${limit}&language=en`;
    const res = await fetch(url, {
        headers: { 'X-Api-Key': key },
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok)
        return [];
    const json = (await res.json());
    const now = new Date().toISOString();
    return (json.articles ?? []).map((a) => ({
        id: crypto.randomUUID(),
        source: 'rss',
        title: a.title ?? query,
        url: a.url,
        snippet: a.description ?? '',
        tags: ['news', query.toLowerCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { publishedAt: a.publishedAt, query },
    }));
}
async function googleNewsRss(query, limit) {
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok)
        return [];
    const xml = await res.text();
    const now = new Date().toISOString();
    return parseRssItems(xml, limit).map((item) => ({
        id: crypto.randomUUID(),
        source: 'rss',
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        tags: ['news', query.toLowerCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { query, feed: 'google_news_rss' },
    }));
}
async function fetchNewsForTopic(topic, limit = 8) {
    const fromApi = await newsApiSearch(topic, limit);
    if (fromApi.length > 0)
        return fromApi;
    return googleNewsRss(topic, limit);
}
//# sourceMappingURL=rss-news.js.map
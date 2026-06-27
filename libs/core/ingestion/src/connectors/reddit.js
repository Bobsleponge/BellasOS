"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRedditFeeds = fetchRedditFeeds;
const default_feeds_1 = require("../feeds/default-feeds");
const UA = { 'user-agent': 'BellasOS/0.1 (data-ingestion)' };
async function fetchRedditFeeds(subs = default_feeds_1.DEFAULT_REDDIT_SUBS, limitPerSub = 8) {
    const now = new Date().toISOString();
    const docs = [];
    for (const sub of subs) {
        try {
            const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=${limitPerSub}`;
            const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
            if (!res.ok)
                continue;
            const json = (await res.json());
            for (const child of json.data?.children ?? []) {
                const post = child.data;
                if (!post?.title)
                    continue;
                const snippet = (post.selftext || post.url || '').slice(0, 500);
                docs.push({
                    id: crypto.randomUUID(),
                    source: 'reddit',
                    title: post.title,
                    url: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url,
                    snippet: snippet || `r/${post.subreddit ?? sub} — score ${post.score ?? 0}`,
                    tags: ['reddit', 'social', sub.toLowerCase(), (post.subreddit ?? sub).toLowerCase()],
                    fetchedAt: now,
                    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                    metadata: {
                        subreddit: post.subreddit ?? sub,
                        score: post.score,
                        comments: post.num_comments,
                    },
                });
            }
        }
        catch {
            /* skip sub */
        }
    }
    return docs;
}
//# sourceMappingURL=reddit.js.map
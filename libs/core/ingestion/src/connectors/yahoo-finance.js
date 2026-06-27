"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectYahooFinance = collectYahooFinance;
const default_feeds_1 = require("../feeds/default-feeds");
const forex_1 = require("./forex");
const market_1 = require("./market");
const UA = { 'user-agent': 'BellasOS/0.1 (data-ingestion)' };
async function yahooFinanceNews(symbols, limit = 8) {
    const docs = [];
    const now = new Date().toISOString();
    const query = symbols.slice(0, 5).join(' OR ');
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=${limit}`;
        const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
        if (!res.ok)
            return docs;
        const json = (await res.json());
        for (const item of json.news ?? []) {
            if (!item.title)
                continue;
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
    }
    catch {
        /* skip */
    }
    return docs;
}
async function yahooTrending(limit = 15) {
    const docs = [];
    const now = new Date().toISOString();
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/trending/US?count=${limit}`;
        const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
        if (!res.ok)
            return docs;
        const json = (await res.json());
        const quotes = json.finance?.result?.[0]?.quotes ?? [];
        for (const q of quotes) {
            if (!q.symbol)
                continue;
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
    }
    catch {
        /* skip */
    }
    return docs;
}
async function collectYahooFinance(symbols = default_feeds_1.DEFAULT_YAHOO_WATCHLIST) {
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const docs = [];
    for (const sym of unique) {
        try {
            const quote = await (0, market_1.fetchMarketQuote)(sym);
            if (quote) {
                docs.push({ ...quote, source: 'yahoo_finance', tags: [...quote.tags, 'yahoo'] });
            }
        }
        catch {
            /* skip symbol */
        }
    }
    docs.push(...(await yahooFinanceNews(unique)));
    docs.push(...(await yahooTrending()));
    docs.push(...(await (0, forex_1.fetchForexRates)((0, forex_1.getDefaultForexPairs)(), ['yahoo', 'forex'])));
    return docs;
}
//# sourceMappingURL=yahoo-finance.js.map
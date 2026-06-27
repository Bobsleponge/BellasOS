"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarketQuote = fetchMarketQuote;
exports.refreshPortfolioPrices = refreshPortfolioPrices;
async function alphaVantageQuote(symbol) {
    const key = process.env.ALPHA_VANTAGE_KEY;
    if (!key)
        return null;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok)
        return null;
    const json = (await res.json());
    const q = json['Global Quote'];
    if (!q?.['05. price'])
        return null;
    const price = q['05. price'];
    const change = q['09. change'] ?? '';
    const pct = q['10. change percent'] ?? '';
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        source: 'market',
        title: `${symbol} quote`,
        snippet: `${symbol}: $${price} (${pct}, ${change})`,
        body: JSON.stringify(q, null, 2),
        tags: ['market', symbol.toUpperCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { symbol: symbol.toUpperCase(), price: Number(price) },
    };
}
async function yahooQuote(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
        headers: { 'user-agent': 'BellasOS/0.1' },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok)
        return null;
    const json = (await res.json());
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice)
        return null;
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        source: 'market',
        title: `${meta.symbol ?? symbol} quote`,
        snippet: `${meta.symbol ?? symbol}: ${meta.regularMarketPrice} ${meta.currency ?? ''}`.trim(),
        tags: ['market', (meta.symbol ?? symbol).toUpperCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: { symbol: (meta.symbol ?? symbol).toUpperCase(), price: meta.regularMarketPrice },
    };
}
async function fetchMarketQuote(symbol) {
    return (await alphaVantageQuote(symbol)) ?? (await yahooQuote(symbol));
}
async function refreshPortfolioPrices(symbols) {
    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const docs = [];
    for (const sym of unique) {
        try {
            const doc = await fetchMarketQuote(sym);
            if (doc)
                docs.push(doc);
        }
        catch {
            /* skip symbol */
        }
    }
    return docs;
}
//# sourceMappingURL=market.js.map
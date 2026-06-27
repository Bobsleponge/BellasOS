"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectForexQuery = detectForexQuery;
exports.pickPrimaryForexSymbols = pickPrimaryForexSymbols;
exports.formatForexSpokenReply = formatForexSpokenReply;
exports.fetchForexRates = fetchForexRates;
exports.getDefaultForexPairs = getDefaultForexPairs;
const UA = { 'user-agent': 'BellasOS/0.1 (data-ingestion)' };
const CURRENCY_ALIASES = {
    usd: 'USD',
    dollar: 'USD',
    dollars: 'USD',
    america: 'USD',
    american: 'USD',
    'united states': 'USD',
    usa: 'USD',
    us: 'USD',
    zar: 'ZAR',
    rand: 'ZAR',
    rands: 'ZAR',
    'south africa': 'ZAR',
    'south african': 'ZAR',
    eur: 'EUR',
    euro: 'EUR',
    europe: 'EUR',
    gbp: 'GBP',
    pound: 'GBP',
    sterling: 'GBP',
    britain: 'GBP',
    uk: 'GBP',
    jpy: 'JPY',
    yen: 'JPY',
    japan: 'JPY',
    aud: 'AUD',
    australia: 'AUD',
    cad: 'CAD',
    canada: 'CAD',
};
function detectForexQuery(query) {
    const q = query.toLowerCase();
    const isForex = /\b(exchange rate|forex|fx|currency conversion|convert currency)\b/i.test(q) ||
        (/\b(rate|exchange|currency)\b/i.test(q) &&
            (/\b(dollar|rand|usd|zar|euro|pound|yen)\b/i.test(q) ||
                /\b(south africa|america|united states|usa|europe|britain|japan)\b/i.test(q)));
    if (!isForex)
        return null;
    const found = new Set();
    for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
        if (q.includes(alias))
            found.add(code);
    }
    const codes = [...found];
    const symbols = [];
    if (codes.length >= 2) {
        symbols.push(`${codes[0]}${codes[1]}=X`, `${codes[1]}${codes[0]}=X`);
    }
    else if (codes.length === 1) {
        const c = codes[0];
        if (c === 'ZAR')
            symbols.push('USDZAR=X', 'ZARUSD=X');
        else if (c === 'USD')
            symbols.push('EURUSD=X', 'USDZAR=X', 'GBPUSD=X');
        else
            symbols.push(`${c}USD=X`, `USD${c}=X`);
    }
    else {
        symbols.push('USDZAR=X', 'EURUSD=X', 'GBPUSD=X');
    }
    return {
        symbols: [...new Set(symbols)],
        base: codes[0],
        quote: codes[1],
    };
}
function pickPrimaryForexSymbols(forex, query) {
    const q = query.toLowerCase();
    const codes = new Set();
    for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
        if (q.includes(alias))
            codes.add(code);
    }
    const list = [...codes];
    if (list.includes('USD') && list.includes('ZAR'))
        return ['USDZAR=X'];
    if (list.includes('EUR') && list.includes('USD'))
        return ['EURUSD=X'];
    if (list.includes('GBP') && list.includes('USD'))
        return ['GBPUSD=X'];
    if (list.includes('USD') && list.includes('JPY'))
        return ['USDJPY=X'];
    if (list.length >= 2)
        return [`${list[0]}${list[1]}=X`];
    if (list.length === 1 && list[0] === 'ZAR')
        return ['USDZAR=X'];
    return [forex.symbols[0] ?? 'USDZAR=X'];
}
const SPOKEN_CURRENCY = {
    USD: 'US dollar',
    ZAR: 'rand',
    EUR: 'euro',
    GBP: 'British pound',
    JPY: 'yen',
    AUD: 'Australian dollar',
    CAD: 'Canadian dollar',
};
function formatForexSpokenReply(doc) {
    const base = String(doc.metadata.base ?? '');
    const quote = String(doc.metadata.quote ?? '');
    const rate = Number(doc.metadata.rate);
    const baseLabel = SPOKEN_CURRENCY[base] ?? base;
    const quoteLabel = SPOKEN_CURRENCY[quote] ?? quote;
    const rounded = rate >= 10 ? rate.toFixed(2) : rate.toFixed(4);
    return `One ${baseLabel} is about ${rounded} ${quoteLabel} right now.`;
}
const fxCache = new Map();
const FX_CACHE_MS = 5 * 60 * 1000;
async function cachedForexQuote(symbol) {
    const hit = fxCache.get(symbol);
    if (hit && hit.expiresAt > Date.now())
        return hit.doc;
    const doc = await yahooForexQuote(symbol);
    if (doc)
        fxCache.set(symbol, { doc, expiresAt: Date.now() + FX_CACHE_MS });
    return doc;
}
async function yahooForexQuote(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
    if (!res.ok)
        return null;
    const json = (await res.json());
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice)
        return null;
    const sym = meta.symbol ?? symbol;
    const base = sym.replace('=X', '').slice(0, 3);
    const quote = sym.replace('=X', '').slice(3, 6);
    const now = new Date().toISOString();
    const rate = meta.regularMarketPrice;
    return {
        id: crypto.randomUUID(),
        source: 'yahoo_finance',
        title: `${base}/${quote} exchange rate`,
        snippet: `1 ${base} = ${rate} ${quote} (Yahoo Finance live FX, ${meta.currency ?? quote})`,
        tags: ['forex', 'exchange-rate', 'yahoo', base.toLowerCase(), quote.toLowerCase(), sym.toLowerCase()],
        fetchedAt: now,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        metadata: {
            symbol: sym,
            base,
            quote,
            rate,
            currency: meta.currency ?? quote,
            kind: 'forex',
        },
    };
}
async function fetchForexRates(symbols, extraTags = []) {
    const unique = [...new Set(symbols)];
    const results = await Promise.all(unique.map((symbol) => cachedForexQuote(symbol)));
    return results
        .filter((doc) => doc != null)
        .map((doc) => ({ ...doc, tags: [...new Set([...doc.tags, ...extraTags])] }));
}
function getDefaultForexPairs() {
    return (process.env.INGEST_FOREX_PAIRS ?? 'USDZAR=X,EURUSD=X,GBPUSD=X,USDJPY=X')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
//# sourceMappingURL=forex.js.map
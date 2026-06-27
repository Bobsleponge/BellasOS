"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecent = exports.saveDocuments = exports.docsToSourceRefs = exports.formatDocsForPrompt = exports.IngestionService = void 0;
exports.getIngestionService = getIngestionService;
const observability_1 = require("@bellasos/observability");
const alerts_1 = require("./alerts");
const finnhub_1 = require("./connectors/finnhub");
const market_1 = require("./connectors/market");
const rss_news_1 = require("./connectors/rss-news");
const rss_feeds_1 = require("./connectors/rss-feeds");
const reddit_1 = require("./connectors/reddit");
const sec_edgar_1 = require("./connectors/sec-edgar");
const status_1 = require("./connectors/status");
const url_fetch_1 = require("./connectors/url-fetch");
const web_search_1 = require("./connectors/web-search");
const context_ranking_1 = require("./context-ranking");
const forex_1 = require("./connectors/forex");
const yahoo_finance_1 = require("./connectors/yahoo-finance");
const default_feeds_1 = require("./feeds/default-feeds");
const store_1 = require("./store");
Object.defineProperty(exports, "docsToSourceRefs", { enumerable: true, get: function () { return store_1.docsToSourceRefs; } });
Object.defineProperty(exports, "formatDocsForPrompt", { enumerable: true, get: function () { return store_1.formatDocsForPrompt; } });
Object.defineProperty(exports, "listRecent", { enumerable: true, get: function () { return store_1.listRecent; } });
Object.defineProperty(exports, "saveDocuments", { enumerable: true, get: function () { return store_1.saveDocuments; } });
const log = (0, observability_1.createLogger)({ lib: 'ingestion' });
class IngestionService {
    lastCollectionAt = null;
    async searchAndFetch(query, tags = [], maxResults = 5) {
        const hits = await (0, web_search_1.webSearch)(query, tags, maxResults);
        await (0, store_1.saveDocuments)(hits);
        const enriched = [...hits];
        for (const hit of hits.slice(0, 3)) {
            if (!hit.url)
                continue;
            try {
                const { title, body } = await (0, url_fetch_1.fetchUrlText)(hit.url);
                const doc = {
                    ...hit,
                    id: crypto.randomUUID(),
                    source: 'url_fetch',
                    title,
                    body,
                    tags: [...hit.tags, 'fetched'],
                };
                enriched.push(doc);
                await (0, store_1.saveDocuments)([doc]);
            }
            catch (err) {
                log.debug('url fetch skipped', { url: hit.url, error: err.message });
            }
        }
        return enriched;
    }
    async pollSectorNews(sectors) {
        const all = [];
        for (const sector of sectors) {
            try {
                const docs = await (0, rss_news_1.fetchNewsForTopic)(`${sector} news`, 6);
                await (0, store_1.saveDocuments)(docs);
                all.push(...docs);
            }
            catch (err) {
                log.warn('sector news poll failed', { sector, error: err.message });
            }
        }
        return all;
    }
    async refreshPrices(symbols) {
        const docs = await (0, market_1.refreshPortfolioPrices)(symbols);
        await (0, store_1.saveDocuments)(docs);
        return docs;
    }
    async runWorldCollection(opts) {
        const sectors = opts?.sectors ?? ['AI', 'Energy', 'Mining', 'Healthcare', 'Macroeconomics'];
        const symbols = opts?.symbols ?? default_feeds_1.DEFAULT_YAHOO_WATCHLIST;
        const bySource = {};
        const all = [];
        const collect = async (label, fn) => {
            try {
                const docs = await fn();
                bySource[label] = docs.length;
                all.push(...docs);
                if (docs.length > 0)
                    await (0, store_1.saveDocuments)(docs);
            }
            catch (err) {
                bySource[label] = 0;
                log.warn('world collection step failed', { label, error: err.message });
            }
        };
        await collect('rss_feeds', () => (0, rss_feeds_1.pollCuratedRssFeeds)(5));
        await collect('sector_news', () => this.pollSectorNews(sectors.slice(0, 8)));
        await collect('yahoo_finance', () => (0, yahoo_finance_1.collectYahooFinance)(symbols));
        await collect('forex', () => (0, forex_1.fetchForexRates)((0, forex_1.getDefaultForexPairs)(), ['world-collection']));
        await collect('sec_edgar', () => (0, sec_edgar_1.fetchRecentSecFilings)(25));
        await collect('reddit', () => (0, reddit_1.fetchRedditFeeds)());
        await collect('finnhub', () => (0, finnhub_1.fetchFinnhubSignals)());
        this.lastCollectionAt = new Date().toISOString();
        log.info('world collection complete', { total: all.length, bySource });
        return {
            total: all.length,
            bySource,
            collectedAt: this.lastCollectionAt,
        };
    }
    getStatus() {
        return {
            connectors: (0, status_1.getConnectorStatuses)(),
            lastCollectionAt: this.lastCollectionAt,
        };
    }
    async getStatusAsync() {
        const recent = await (0, store_1.listRecent)({ limit: 1, sinceHours: 168 });
        return {
            connectors: (0, status_1.getConnectorStatuses)(),
            lastCollectionAt: this.lastCollectionAt ?? recent[0]?.fetchedAt ?? null,
        };
    }
    async tryFastAnswer(query) {
        const forex = (0, forex_1.detectForexQuery)(query);
        if (!forex)
            return null;
        const symbols = (0, forex_1.pickPrimaryForexSymbols)(forex, query);
        const docs = await (0, forex_1.fetchForexRates)(symbols, ['jarvis', 'fast']);
        const doc = docs[0];
        if (!doc?.metadata?.rate)
            return null;
        void (0, store_1.saveDocuments)([doc]);
        return {
            reply: (0, forex_1.formatForexSpokenReply)(doc),
            sources: (0, store_1.docsToSourceRefs)([doc]),
            dataAsOf: doc.fetchedAt,
        };
    }
    async gatherTargetedContext(query, tags = []) {
        const mergedTags = [...new Set([...tags, 'jarvis', 'live'])];
        const docs = [];
        const forex = (0, forex_1.detectForexQuery)(query);
        if (forex) {
            docs.push(...(await (0, forex_1.fetchForexRates)((0, forex_1.pickPrimaryForexSymbols)(forex, query), mergedTags)));
            return docs;
        }
        if (/\b(stock|market|price|ticker|nasdaq|dow|s&p|shares)\b/i.test(query) && !forex) {
            docs.push(...(await (0, yahoo_finance_1.collectYahooFinance)(default_feeds_1.DEFAULT_YAHOO_WATCHLIST.slice(0, 8))));
        }
        if (/\b(filing|sec|insider|8-k|10-k|edgar)\b/i.test(query)) {
            docs.push(...(await (0, sec_edgar_1.fetchRecentSecFilings)(10)));
        }
        if (/\b(reddit|social|sentiment|buzz)\b/i.test(query)) {
            docs.push(...(await (0, reddit_1.fetchRedditFeeds)()));
        }
        return docs;
    }
    async gatherLiveContext(query, tags = []) {
        const mergedTags = [...new Set([...tags, 'jarvis', 'live'])];
        const targeted = await this.gatherTargetedContext(query, tags);
        const tasks = [
            Promise.resolve(targeted),
            (0, web_search_1.webSearch)(query, mergedTags, 4),
            (0, rss_news_1.fetchNewsForTopic)(query, 5),
        ];
        if (!(0, forex_1.detectForexQuery)(query) && /\b(stock|market|price|ticker|nasdaq|dow|s&p)\b/i.test(query)) {
            tasks.push((0, yahoo_finance_1.collectYahooFinance)(default_feeds_1.DEFAULT_YAHOO_WATCHLIST.slice(0, 6)));
        }
        const batches = await Promise.allSettled(tasks);
        const docs = [];
        for (const batch of batches) {
            if (batch.status === 'fulfilled')
                docs.push(...batch.value);
        }
        if (docs.length > 0)
            await (0, store_1.saveDocuments)(docs);
        return docs;
    }
    looksLikeGeneralQuestion(query) {
        const q = query.trim();
        if (!q || q.length > 220)
            return false;
        if ((0, forex_1.detectForexQuery)(q))
            return false;
        return (/\?|^(what|who|when|where|why|how|which|is|are|was|were|do|does|did|can|could|tell me|define|explain)\b/i.test(q) || q.split(/\s+/).length <= 8);
    }
    /** Live lookup for prices, news, and time-sensitive facts — not static general knowledge. */
    needsLiveLookup(query) {
        const q = query.toLowerCase();
        if ((0, forex_1.detectForexQuery)(query))
            return true;
        return /\b(today|right now|currently|current|latest|live|now|price|stock|market|ticker|nasdaq|dow|s&p|news|weather|score|rate|bitcoin|crypto|earnings|filing|sec\b|insider|just happened|this week|this month|breaking|headline)\b/i.test(q);
    }
    async getContextForQuery(query, tags = [], opts) {
        const maxDocs = opts?.maxDocs ?? 12;
        const forex = (0, forex_1.detectForexQuery)(query);
        if (forex) {
            const docs = await (0, forex_1.fetchForexRates)((0, forex_1.pickPrimaryForexSymbols)(forex, query), [...tags, 'jarvis']);
            const doc = docs[0];
            if (doc) {
                return {
                    docs: [doc],
                    promptBlock: (0, store_1.formatDocsForPrompt)([doc]),
                    sources: (0, store_1.docsToSourceRefs)([doc]),
                    fetchedAt: doc.fetchedAt,
                };
            }
        }
        const targeted = await this.gatherTargetedContext(query, tags);
        const onTopic = [...targeted];
        const wantsLive = this.needsLiveLookup(query);
        const searchLimit = 3;
        if (wantsLive && onTopic.length < maxDocs) {
            const [search, news] = await Promise.allSettled([
                (0, web_search_1.webSearch)(query, [...tags, 'jarvis'], searchLimit),
                (0, rss_news_1.fetchNewsForTopic)(query, 2),
            ]);
            if (search.status === 'fulfilled')
                onTopic.push(...search.value);
            if (news.status === 'fulfilled')
                onTopic.push(...news.value);
        }
        const docs = (0, context_ranking_1.filterRelevantDocs)(query, (0, context_ranking_1.dedupeDocs)(onTopic), maxDocs);
        if (targeted.length > 0)
            void (0, store_1.saveDocuments)(targeted);
        const fetchedAt = docs[0]?.fetchedAt ?? new Date().toISOString();
        return {
            docs,
            promptBlock: (0, store_1.formatDocsForPrompt)(docs),
            sources: (0, store_1.docsToSourceRefs)(docs),
            fetchedAt,
        };
    }
    async runAlertEvaluation(rules) {
        const docs = await (0, store_1.listRecent)({ sinceHours: 24, limit: 100 });
        return (0, alerts_1.evaluateAlerts)(rules, docs);
    }
    listRecent(opts) {
        return (0, store_1.listRecent)(opts);
    }
}
exports.IngestionService = IngestionService;
let singleton = null;
function getIngestionService() {
    if (!singleton)
        singleton = new IngestionService();
    return singleton;
}
//# sourceMappingURL=service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectorStatuses = getConnectorStatuses;
function hasKey(name) {
    const v = process.env[name];
    return Boolean(v && v.trim().length > 0);
}
function getConnectorStatuses() {
    return [
        {
            id: 'rss_feeds',
            name: 'Curated RSS',
            enabled: true,
            requiresKey: false,
            configured: true,
            description: 'BBC, Mining.com, OilPrice, TechCrunch, Moneyweb + INGEST_RSS_URLS',
        },
        {
            id: 'google_news',
            name: 'Google News RSS',
            enabled: true,
            requiresKey: false,
            configured: true,
            description: 'Sector news via Google News RSS (no API key)',
        },
        {
            id: 'yahoo_finance',
            name: 'Yahoo Finance',
            enabled: true,
            requiresKey: false,
            configured: true,
            description: 'Live stock quotes, FX pairs (USD/ZAR etc.), trending tickers, finance news',
        },
        {
            id: 'sec_edgar',
            name: 'SEC EDGAR',
            enabled: true,
            requiresKey: false,
            configured: true,
            description: 'Recent 8-K, insider Form 4, 13D filings before mainstream news',
        },
        {
            id: 'reddit',
            name: 'Reddit',
            enabled: true,
            requiresKey: false,
            configured: true,
            description: 'Hot posts from INGEST_REDDIT_SUBS (worldnews, investing, etc.)',
        },
        {
            id: 'web_search',
            name: 'Web search',
            enabled: true,
            requiresKey: true,
            configured: hasKey('TAVILY_API_KEY') || hasKey('SERPER_API_KEY'),
            description: 'Tavily or Serper when configured; DuckDuckGo + Wikipedia fallback without keys',
        },
        {
            id: 'newsapi',
            name: 'NewsAPI',
            enabled: true,
            requiresKey: true,
            configured: hasKey('NEWSAPI_KEY'),
            description: 'Premium news API (falls back to Google News RSS)',
        },
        {
            id: 'finnhub',
            name: 'Finnhub',
            enabled: true,
            requiresKey: true,
            configured: hasKey('FINNHUB_API_KEY'),
            description: 'Market news and signals via FINNHUB_API_KEY',
        },
        {
            id: 'alpha_vantage',
            name: 'Alpha Vantage',
            enabled: true,
            requiresKey: true,
            configured: hasKey('ALPHA_VANTAGE_KEY'),
            description: 'Premium quotes (falls back to Yahoo)',
        },
    ];
}
//# sourceMappingURL=status.js.map
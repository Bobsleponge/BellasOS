export type IngestSource = 'web_search' | 'rss' | 'rss_feed' | 'market' | 'yahoo_finance' | 'sec_edgar' | 'reddit' | 'finnhub' | 'url_fetch';
export interface IngestDocument {
    id: string;
    source: IngestSource;
    title: string;
    url?: string;
    snippet: string;
    body?: string;
    tags: string[];
    fetchedAt: string;
    expiresAt?: string;
    metadata: Record<string, unknown>;
}
export interface IngestSourceRef {
    url?: string;
    title: string;
    fetchedAt: string;
    source?: IngestSource;
}
export interface IngestFeedDef {
    id: string;
    name: string;
    url: string;
    tags: string[];
    region?: string;
}
export interface IngestConnectorStatus {
    id: string;
    name: string;
    enabled: boolean;
    requiresKey: boolean;
    configured: boolean;
    description: string;
}
//# sourceMappingURL=types.d.ts.map
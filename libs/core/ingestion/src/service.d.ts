import { type AlertMatch, type AlertRule } from './alerts';
import { docsToSourceRefs, formatDocsForPrompt, listRecent, saveDocuments } from './store';
import type { IngestConnectorStatus, IngestDocument, IngestSourceRef } from './types';
export interface WorldCollectionResult {
    total: number;
    bySource: Record<string, number>;
    collectedAt: string;
}
export interface FastAnswer {
    reply: string;
    sources: IngestSourceRef[];
    dataAsOf: string;
}
export declare class IngestionService {
    private lastCollectionAt;
    searchAndFetch(query: string, tags?: string[], maxResults?: number): Promise<IngestDocument[]>;
    pollSectorNews(sectors: string[]): Promise<IngestDocument[]>;
    refreshPrices(symbols: string[]): Promise<IngestDocument[]>;
    runWorldCollection(opts?: {
        sectors?: string[];
        symbols?: string[];
    }): Promise<WorldCollectionResult>;
    getStatus(): {
        connectors: IngestConnectorStatus[];
        lastCollectionAt: string | null;
    };
    getStatusAsync(): Promise<{
        connectors: IngestConnectorStatus[];
        lastCollectionAt: string | null;
    }>;
    tryFastAnswer(query: string): Promise<FastAnswer | null>;
    gatherTargetedContext(query: string, tags?: string[]): Promise<IngestDocument[]>;
    gatherLiveContext(query: string, tags?: string[]): Promise<IngestDocument[]>;
    looksLikeGeneralQuestion(query: string): boolean;
    /** Live lookup for prices, news, and time-sensitive facts — not static general knowledge. */
    needsLiveLookup(query: string): boolean;
    getContextForQuery(query: string, tags?: string[], opts?: {
        maxDocs?: number;
    }): Promise<{
        docs: IngestDocument[];
        promptBlock: string;
        sources: IngestSourceRef[];
        fetchedAt: string;
    }>;
    runAlertEvaluation(rules: AlertRule[]): Promise<AlertMatch[]>;
    listRecent(opts: Parameters<typeof listRecent>[0]): Promise<IngestDocument[]>;
}
export declare function getIngestionService(): IngestionService;
export { formatDocsForPrompt, docsToSourceRefs, saveDocuments, listRecent };
export type { IngestDocument, IngestSourceRef, AlertRule };
export type { AlertMatch } from './alerts';
//# sourceMappingURL=service.d.ts.map
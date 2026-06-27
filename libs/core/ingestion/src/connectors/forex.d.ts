import type { IngestDocument } from '../types';
export declare function detectForexQuery(query: string): {
    symbols: string[];
    base?: string;
    quote?: string;
} | null;
export declare function pickPrimaryForexSymbols(forex: {
    symbols: string[];
    base?: string;
    quote?: string;
}, query: string): string[];
export declare function formatForexSpokenReply(doc: IngestDocument): string;
export declare function fetchForexRates(symbols: string[], extraTags?: string[]): Promise<IngestDocument[]>;
export declare function getDefaultForexPairs(): string[];
//# sourceMappingURL=forex.d.ts.map
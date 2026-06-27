import type { IngestDocument } from './types';
export declare function saveDocuments(docs: IngestDocument[]): Promise<IngestDocument[]>;
export declare function listRecent(opts: {
    tags?: string[];
    source?: string;
    limit?: number;
    sinceHours?: number;
}): Promise<IngestDocument[]>;
export declare function formatDocsForPrompt(docs: IngestDocument[], maxChars?: number): string;
export declare function docsToSourceRefs(docs: IngestDocument[]): {
    url: string | undefined;
    title: string;
    fetchedAt: string;
    source: import("./types").IngestSource;
}[];
//# sourceMappingURL=store.d.ts.map
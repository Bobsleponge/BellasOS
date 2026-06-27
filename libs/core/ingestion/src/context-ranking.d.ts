import type { IngestDocument } from './types';
export declare function scoreDocForQuery(query: string, doc: IngestDocument): number;
export declare function rankDocsForQuery(query: string, docs: IngestDocument[]): IngestDocument[];
export declare function filterRelevantDocs(query: string, docs: IngestDocument[], maxDocs: number, minScore?: number): IngestDocument[];
export declare function dedupeDocs(docs: IngestDocument[]): IngestDocument[];
//# sourceMappingURL=context-ranking.d.ts.map
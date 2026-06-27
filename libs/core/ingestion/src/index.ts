export {
  getIngestionService,
  IngestionService,
  formatDocsForPrompt,
  docsToSourceRefs,
  saveDocuments,
  listRecent,
} from './service';
export type {
  IngestDocument,
  IngestSourceRef,
  AlertRule,
  AlertMatch,
} from './service';
export type { WorldCollectionResult, FastAnswer } from './service';
export type { IngestConnectorStatus, IngestFeedDef } from './types';
export { inferWorldSector, scoreIngestDocument } from './collectors/sector-map';
export { defaultCollectorRegistry, CollectorRegistry } from './collectors/registry';
export type { WorldCollector, CollectorRunContext, CollectorRunResult } from './collectors/types';

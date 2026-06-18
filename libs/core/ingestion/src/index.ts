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

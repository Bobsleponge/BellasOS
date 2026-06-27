import type { WorldSector } from '@bellasos/contracts';
import type { IngestDocument } from '../types';

export interface CollectorRunContext {
  sectors?: string[];
  symbols?: string[];
  ventureKeywords?: string[];
}

export interface WorldCollector {
  id: string;
  name: string;
  sectors: WorldSector[];
  collect(ctx: CollectorRunContext): Promise<IngestDocument[]>;
}

export interface CollectorRunResult {
  collectorId: string;
  count: number;
  error?: string;
}

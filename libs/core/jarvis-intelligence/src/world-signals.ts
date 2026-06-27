import type { WorldSector, WorldSignal, WorldSignalKind } from '@bellasos/contracts';
import type { IngestDocument } from '@bellasos/core-ingestion';
import { inferWorldSector, scoreIngestDocument } from '@bellasos/core-ingestion';

function kindFromSource(source: string, doc: IngestDocument): WorldSignalKind {
  if (source === 'sec_edgar') return 'filing';
  if (source === 'yahoo_finance' || source === 'finnhub' || source === 'market') return 'market_move';
  if (source === 'forex') return 'market_move';
  if (doc.tags.some((t) => t.includes('pattern'))) return 'pattern';
  return 'news';
}

export function normalizeIngestToWorldSignal(doc: IngestDocument): WorldSignal {
  const sector = inferWorldSector(doc);
  return {
    ingestDocId: doc.id,
    sector,
    kind: kindFromSource(doc.source, doc),
    title: doc.title,
    summary: doc.snippet || doc.title,
    source: doc.source,
    url: doc.url,
    tags: doc.tags,
    fetchedAt: doc.fetchedAt,
    baseScore: scoreIngestDocument(doc, sector),
  };
}

export function ingestDocsToWorldSignals(docs: IngestDocument[]): WorldSignal[] {
  const seen = new Set<string>();
  const signals: WorldSignal[] = [];

  for (const doc of docs) {
    const key = doc.url ?? `${doc.title}:${doc.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push(normalizeIngestToWorldSignal(doc));
  }

  return signals.sort((a, b) => b.baseScore - a.baseScore);
}

export function worldSignalToIntelligenceId(world: WorldSignal): string {
  return `world:${world.ingestDocId}`;
}

export function sourceForSector(sector: WorldSector): string {
  return `world.${sector}`;
}

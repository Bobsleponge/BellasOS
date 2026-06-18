import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';
import type { IngestDocument } from './types';

const log = createLogger({ lib: 'ingestion-store' });
const memoryDocs: IngestDocument[] = [];

export async function saveDocuments(docs: IngestDocument[]): Promise<IngestDocument[]> {
  if (docs.length === 0) return [];

  if (!isDbAvailable()) {
    memoryDocs.unshift(...docs);
    if (memoryDocs.length > 500) memoryDocs.length = 500;
    return docs;
  }

  try {
    const db = getDb();
    for (const doc of docs) {
      await db
        .insertInto('core.ingest_documents')
        .values({
          id: doc.id,
          source: doc.source,
          title: doc.title,
          url: doc.url ?? null,
          snippet: doc.snippet,
          body: doc.body ?? null,
          tags: doc.tags,
          metadata: doc.metadata,
          fetched_at: doc.fetchedAt,
          expires_at: doc.expiresAt ?? null,
        })
        .execute();
    }
    await touchIntegrationSync('ingestion');
  } catch (err) {
    log.warn('ingest save failed', { error: (err as Error).message });
    memoryDocs.unshift(...docs);
  }
  return docs;
}

export async function listRecent(opts: {
  tags?: string[];
  source?: string;
  limit?: number;
  sinceHours?: number;
}): Promise<IngestDocument[]> {
  const limit = opts.limit ?? 20;
  const since = opts.sinceHours
    ? new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000).toISOString()
    : undefined;

  if (!isDbAvailable()) {
    let rows = [...memoryDocs];
    if (opts.source) rows = rows.filter((d) => d.source === opts.source);
    if (opts.tags?.length) {
      rows = rows.filter((d) => opts.tags!.some((t) => d.tags.includes(t)));
    }
    if (since) rows = rows.filter((d) => d.fetchedAt >= since);
    return rows.slice(0, limit);
  }

  try {
    let q = getDb()
      .selectFrom('core.ingest_documents')
      .selectAll()
      .orderBy('fetched_at', 'desc')
      .limit(limit);

    if (opts.source) {
      q = q.where('source', '=', opts.source);
    }
    if (since) {
      q = q.where('fetched_at', '>=', since);
    }
    const rows = await q.execute();
    let docs = rows.map(rowToDoc);
    if (opts.tags?.length) {
      docs = docs.filter((d) => opts.tags!.some((t) => d.tags.includes(t)));
    }
    return docs;
  } catch (err) {
    log.warn('ingest list failed', { error: (err as Error).message });
    return memoryDocs.slice(0, limit);
  }
}

function rowToDoc(row: {
  id: string;
  source: string;
  title: string;
  url: string | null;
  snippet: string;
  body: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  fetched_at: string;
  expires_at: string | null;
}): IngestDocument {
  return {
    id: row.id,
    source: row.source as IngestDocument['source'],
    title: row.title,
    url: row.url ?? undefined,
    snippet: row.snippet,
    body: row.body ?? undefined,
    tags: row.tags ?? [],
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at ?? undefined,
    metadata: row.metadata ?? {},
  };
}

async function touchIntegrationSync(platform: string): Promise<void> {
  if (!isDbAvailable()) return;
  try {
    await getDb()
      .updateTable('core.integrations')
      .set({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .where('platform', '=', platform)
      .execute();
  } catch {
    /* optional row may not exist */
  }
}

export function formatDocsForPrompt(docs: IngestDocument[], maxChars = 14_000): string {
  if (docs.length === 0) {
    return 'No live sources retrieved for this question yet. RSS, Yahoo Finance, and forex pairs work without keys.';
  }
  const lines: string[] = [];
  let used = 0;
  for (const d of docs) {
    const block =
      `[${d.fetchedAt}] ${d.title}\n` +
      (d.url ? `URL: ${d.url}\n` : '') +
      `${d.snippet}\n` +
      (d.body ? `${d.body.slice(0, 2000)}\n` : '');
    if (used + block.length > maxChars) break;
    lines.push(block);
    used += block.length;
  }
  return lines.join('\n---\n');
}

export function docsToSourceRefs(docs: IngestDocument[]) {
  return docs.map((d) => ({
    url: d.url,
    title: d.title,
    fetchedAt: d.fetchedAt,
    source: d.source,
  }));
}

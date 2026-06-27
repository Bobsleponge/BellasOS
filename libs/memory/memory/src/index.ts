import { sql } from 'kysely';
import {
  type AIGateway,
  type MemoryGateway,
  type MemoryHit,
  type MemoryItem,
  type MemoryQuery,
  type MemoryTier,
  type MemoryWriteInput,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';
import { ShortTermMemory } from './short-term';

export * from './short-term';

const log = createLogger({ lib: 'memory' });

interface InMemoryRecord extends MemoryItem {
  embedding?: number[];
}

export interface MemoryDeps {
  ai: AIGateway;
  redisUrl?: string;
}

/**
 * Three-tier memory system: short-term (Redis), working (Postgres) and
 * long-term (Postgres + pgvector). Long-term writes are embedded for semantic
 * recall. Degrades to in-memory stores when infrastructure is unavailable.
 */
export class MemorySystem implements MemoryGateway {
  readonly short: ShortTermMemory;
  private readonly mem: InMemoryRecord[] = [];

  constructor(private readonly deps: MemoryDeps) {
    this.short = new ShortTermMemory(deps.redisUrl);
  }

  async remember(input: MemoryWriteInput): Promise<MemoryItem> {
    const item: MemoryItem = {
      id: crypto.randomUUID(),
      tier: input.tier,
      ownerId: input.ownerId,
      content: input.content,
      tags: input.tags ?? [],
      sourceRef: input.sourceRef,
      createdAt: new Date().toISOString(),
    };

    if (input.tier === 'short') {
      await this.short.append(input.ownerId, input.content);
      return item;
    }

    const shouldEmbed = input.tier === 'long' && input.embed !== false;
    let embedding: number[] | undefined;
    if (shouldEmbed) {
      try {
        const res = await this.deps.ai.embed({ input: input.content });
        embedding = res.vectors[0];
      } catch (err) {
        log.warn('embedding failed; storing without vector', {
          error: (err as Error).message,
        });
      }
    }

    if (!isDbAvailable()) {
      this.mem.push({ ...item, embedding });
      return item;
    }

    const db = getDb();
    await db
      .insertInto('memory.items')
      .values({
        id: item.id,
        tier: item.tier,
        owner_id: item.ownerId,
        content: item.content,
        tags: item.tags,
        source_ref: item.sourceRef ?? null,
      })
      .execute();

    if (embedding) {
      const literal = `[${embedding.join(',')}]`;
      await sql`
        INSERT INTO memory.embeddings (item_id, embedding)
        VALUES (${item.id}, ${literal}::vector)
        ON CONFLICT (item_id) DO UPDATE SET embedding = EXCLUDED.embedding
      `.execute(db);
    }
    return item;
  }

  async recall(query: MemoryQuery): Promise<MemoryHit[]> {
    const limit = query.limit ?? 8;
    const tier = query.tier ?? 'long';

    if (tier === 'short') {
      const ctx = await this.short.context(query.ownerId, limit);
      return ctx.map((content, i) => ({
        id: `stm-${i}`,
        tier: 'short' as MemoryTier,
        ownerId: query.ownerId,
        content,
        tags: [],
        createdAt: new Date().toISOString(),
        score: 1,
      }));
    }

    if (tier === 'long') return this.recallLong(query, limit);
    return this.recallKeyword(query, tier, limit);
  }

  private async recallLong(
    query: MemoryQuery,
    limit: number,
  ): Promise<MemoryHit[]> {
    let vector: number[] | undefined;
    try {
      const res = await this.deps.ai.embed({ input: query.query });
      vector = res.vectors[0];
    } catch {
      vector = undefined;
    }

    if (!isDbAvailable() || !vector) {
      return this.recallKeyword(query, 'long', limit);
    }

    const literal = `[${vector.join(',')}]`;
    const result = await sql<{
      id: string;
      tier: string;
      owner_id: string;
      content: string;
      tags: string[];
      source_ref: Record<string, unknown> | null;
      created_at: string;
      score: number;
    }>`
      SELECT i.id, i.tier, i.owner_id, i.content, i.tags, i.source_ref,
             i.created_at,
             1 - (e.embedding <=> ${literal}::vector) AS score
      FROM memory.items i
      JOIN memory.embeddings e ON e.item_id = i.id
      WHERE i.owner_id = ${query.ownerId} AND i.tier = 'long'
      ORDER BY e.embedding <=> ${literal}::vector
      LIMIT ${limit}
    `.execute(getDb());

    return result.rows.map((r) => ({
      id: r.id,
      tier: r.tier as MemoryTier,
      ownerId: r.owner_id,
      content: r.content,
      tags: r.tags,
      sourceRef: r.source_ref ?? undefined,
      createdAt: r.created_at,
      score: Number(r.score),
    }));
  }

  private async recallKeyword(
    query: MemoryQuery,
    tier: MemoryTier,
    limit: number,
  ): Promise<MemoryHit[]> {
    const terms = query.query.toLowerCase().split(/\s+/).filter(Boolean);
    const score = (content: string): number => {
      const c = content.toLowerCase();
      return terms.reduce((n, t) => (c.includes(t) ? n + 1 : n), 0);
    };

    if (!isDbAvailable()) {
      return this.mem
        .filter((m) => m.ownerId === query.ownerId && m.tier === tier)
        .map((m) => ({ ...m, score: score(m.content) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    const rows = await getDb()
      .selectFrom('memory.items')
      .selectAll()
      .where('owner_id', '=', query.ownerId)
      .where('tier', '=', tier)
      .orderBy('created_at', 'desc')
      .limit(100)
      .execute();

    return rows
      .map((r) => ({
        id: r.id,
        tier: r.tier as MemoryTier,
        ownerId: r.owner_id,
        content: r.content,
        tags: r.tags,
        sourceRef: r.source_ref ?? undefined,
        createdAt: r.created_at,
        score: score(r.content),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async forget(id: string): Promise<void> {
    const idx = this.mem.findIndex((m) => m.id === id);
    if (idx >= 0) this.mem.splice(idx, 1);
    if (isDbAvailable()) {
      await getDb().deleteFrom('memory.items').where('id', '=', id).execute();
    }
  }

  async summarize(ownerId: string, tier: MemoryTier): Promise<string> {
    const hits = await this.recall({ ownerId, query: '', tier, limit: 50 });
    if (hits.length === 0) return '';
    const corpus = hits.map((h) => `- ${h.content}`).join('\n');
    const res = await this.deps.ai.complete({
      taskType: 'summarization',
      messages: [
        {
          role: 'system',
          content:
            'Summarize the following memory items into a concise briefing.',
        },
        { role: 'user', content: corpus },
      ],
    });

    if (isDbAvailable()) {
      try {
        await getDb()
          .insertInto('memory.summaries')
          .values({ owner_id: ownerId, tier, summary: res.text })
          .execute();
      } catch {
        /* best-effort */
      }
    }
    return res.text;
  }
}

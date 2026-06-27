"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystem = void 0;
const kysely_1 = require("kysely");
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const short_term_1 = require("./short-term");
__exportStar(require("./short-term"), exports);
const log = (0, observability_1.createLogger)({ lib: 'memory' });
/**
 * Three-tier memory system: short-term (Redis), working (Postgres) and
 * long-term (Postgres + pgvector). Long-term writes are embedded for semantic
 * recall. Degrades to in-memory stores when infrastructure is unavailable.
 */
class MemorySystem {
    deps;
    short;
    mem = [];
    constructor(deps) {
        this.deps = deps;
        this.short = new short_term_1.ShortTermMemory(deps.redisUrl);
    }
    async remember(input) {
        const item = {
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
        let embedding;
        if (shouldEmbed) {
            try {
                const res = await this.deps.ai.embed({ input: input.content });
                embedding = res.vectors[0];
            }
            catch (err) {
                log.warn('embedding failed; storing without vector', {
                    error: err.message,
                });
            }
        }
        if (!(0, db_1.isDbAvailable)()) {
            this.mem.push({ ...item, embedding });
            return item;
        }
        const db = (0, db_1.getDb)();
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
            await (0, kysely_1.sql) `
        INSERT INTO memory.embeddings (item_id, embedding)
        VALUES (${item.id}, ${literal}::vector)
        ON CONFLICT (item_id) DO UPDATE SET embedding = EXCLUDED.embedding
      `.execute(db);
        }
        return item;
    }
    async recall(query) {
        const limit = query.limit ?? 8;
        const tier = query.tier ?? 'long';
        if (tier === 'short') {
            const ctx = await this.short.context(query.ownerId, limit);
            return ctx.map((content, i) => ({
                id: `stm-${i}`,
                tier: 'short',
                ownerId: query.ownerId,
                content,
                tags: [],
                createdAt: new Date().toISOString(),
                score: 1,
            }));
        }
        if (tier === 'long')
            return this.recallLong(query, limit);
        return this.recallKeyword(query, tier, limit);
    }
    async recallLong(query, limit) {
        let vector;
        try {
            const res = await this.deps.ai.embed({ input: query.query });
            vector = res.vectors[0];
        }
        catch {
            vector = undefined;
        }
        if (!(0, db_1.isDbAvailable)() || !vector) {
            return this.recallKeyword(query, 'long', limit);
        }
        const literal = `[${vector.join(',')}]`;
        const result = await (0, kysely_1.sql) `
      SELECT i.id, i.tier, i.owner_id, i.content, i.tags, i.source_ref,
             i.created_at,
             1 - (e.embedding <=> ${literal}::vector) AS score
      FROM memory.items i
      JOIN memory.embeddings e ON e.item_id = i.id
      WHERE i.owner_id = ${query.ownerId} AND i.tier = 'long'
      ORDER BY e.embedding <=> ${literal}::vector
      LIMIT ${limit}
    `.execute((0, db_1.getDb)());
        return result.rows.map((r) => ({
            id: r.id,
            tier: r.tier,
            ownerId: r.owner_id,
            content: r.content,
            tags: r.tags,
            sourceRef: r.source_ref ?? undefined,
            createdAt: r.created_at,
            score: Number(r.score),
        }));
    }
    async recallKeyword(query, tier, limit) {
        const terms = query.query.toLowerCase().split(/\s+/).filter(Boolean);
        const score = (content) => {
            const c = content.toLowerCase();
            return terms.reduce((n, t) => (c.includes(t) ? n + 1 : n), 0);
        };
        if (!(0, db_1.isDbAvailable)()) {
            return this.mem
                .filter((m) => m.ownerId === query.ownerId && m.tier === tier)
                .map((m) => ({ ...m, score: score(m.content) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        }
        const rows = await (0, db_1.getDb)()
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
            tier: r.tier,
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
    async forget(id) {
        const idx = this.mem.findIndex((m) => m.id === id);
        if (idx >= 0)
            this.mem.splice(idx, 1);
        if ((0, db_1.isDbAvailable)()) {
            await (0, db_1.getDb)().deleteFrom('memory.items').where('id', '=', id).execute();
        }
    }
    async summarize(ownerId, tier) {
        const hits = await this.recall({ ownerId, query: '', tier, limit: 50 });
        if (hits.length === 0)
            return '';
        const corpus = hits.map((h) => `- ${h.content}`).join('\n');
        const res = await this.deps.ai.complete({
            taskType: 'summarization',
            messages: [
                {
                    role: 'system',
                    content: 'Summarize the following memory items into a concise briefing.',
                },
                { role: 'user', content: corpus },
            ],
        });
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('memory.summaries')
                    .values({ owner_id: ownerId, tier, summary: res.text })
                    .execute();
            }
            catch {
                /* best-effort */
            }
        }
        return res.text;
    }
}
exports.MemorySystem = MemorySystem;
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDocuments = saveDocuments;
exports.listRecent = listRecent;
exports.formatDocsForPrompt = formatDocsForPrompt;
exports.docsToSourceRefs = docsToSourceRefs;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'ingestion-store' });
const memoryDocs = [];
async function saveDocuments(docs) {
    if (docs.length === 0)
        return [];
    if (!(0, db_1.isDbAvailable)()) {
        memoryDocs.unshift(...docs);
        if (memoryDocs.length > 500)
            memoryDocs.length = 500;
        return docs;
    }
    try {
        const db = (0, db_1.getDb)();
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
    }
    catch (err) {
        log.warn('ingest save failed', { error: err.message });
        memoryDocs.unshift(...docs);
    }
    return docs;
}
async function listRecent(opts) {
    const limit = opts.limit ?? 20;
    const since = opts.sinceHours
        ? new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000).toISOString()
        : undefined;
    if (!(0, db_1.isDbAvailable)()) {
        let rows = [...memoryDocs];
        if (opts.source)
            rows = rows.filter((d) => d.source === opts.source);
        if (opts.tags?.length) {
            rows = rows.filter((d) => opts.tags.some((t) => d.tags.includes(t)));
        }
        if (since)
            rows = rows.filter((d) => d.fetchedAt >= since);
        return rows.slice(0, limit);
    }
    try {
        let q = (0, db_1.getDb)()
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
            docs = docs.filter((d) => opts.tags.some((t) => d.tags.includes(t)));
        }
        return docs;
    }
    catch (err) {
        log.warn('ingest list failed', { error: err.message });
        return memoryDocs.slice(0, limit);
    }
}
function rowToDoc(row) {
    return {
        id: row.id,
        source: row.source,
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
async function touchIntegrationSync(platform) {
    if (!(0, db_1.isDbAvailable)())
        return;
    try {
        await (0, db_1.getDb)()
            .updateTable('core.integrations')
            .set({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .where('platform', '=', platform)
            .execute();
    }
    catch {
        /* optional row may not exist */
    }
}
function formatDocsForPrompt(docs, maxChars = 14_000) {
    if (docs.length === 0) {
        return 'No live sources retrieved for this question yet. RSS, Yahoo Finance, and forex pairs work without keys.';
    }
    const lines = [];
    let used = 0;
    for (const d of docs) {
        const block = `[${d.fetchedAt}] ${d.title}\n` +
            (d.url ? `URL: ${d.url}\n` : '') +
            `${d.snippet}\n` +
            (d.body ? `${d.body.slice(0, 2000)}\n` : '');
        if (used + block.length > maxChars)
            break;
        lines.push(block);
        used += block.length;
    }
    return lines.join('\n---\n');
}
function docsToSourceRefs(docs) {
    return docs.map((d) => ({
        url: d.url,
        title: d.title,
        fetchedAt: d.fetchedAt,
        source: d.source,
    }));
}
//# sourceMappingURL=store.js.map
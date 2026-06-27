"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toStoredHolding = exports.buildSyncPayload = exports.portfolioSyncPayloadSchema = void 0;
exports.createPortfolioModule = createPortfolioModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const core_ingestion_1 = require("@bellasos/core-ingestion");
const sync_1 = require("./sync");
Object.defineProperty(exports, "buildSyncPayload", { enumerable: true, get: function () { return sync_1.buildSyncPayload; } });
Object.defineProperty(exports, "portfolioSyncPayloadSchema", { enumerable: true, get: function () { return sync_1.portfolioSyncPayloadSchema; } });
Object.defineProperty(exports, "toStoredHolding", { enumerable: true, get: function () { return sync_1.toStoredHolding; } });
const holdingInput = zod_1.z.object({
    account: zod_1.z.enum(sync_1.ACCOUNTS),
    symbol: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive(),
    costBasis: zod_1.z.number().nonnegative(),
    price: zod_1.z.number().nonnegative().optional(),
});
const holdingIdInput = zod_1.z.object({ id: zod_1.z.string().min(1) });
const watchlistInput = zod_1.z.object({
    symbol: zod_1.z.string().min(1),
    note: zod_1.z.string().optional(),
});
const holdingsImportInput = zod_1.z.object({
    holdings: zod_1.z.array(holdingInput.extend({ updatedAt: zod_1.z.string().optional() })),
    watchlist: zod_1.z.array(watchlistInput).optional(),
    replace: zod_1.z.boolean().optional(),
    source: zod_1.z.enum(['webhook', 'pull', 'manual']).optional(),
});
const manifest = {
    id: 'bellasos.portfolio',
    name: 'Portfolio',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Track Trust, Personal, TFSA, Crypto and Property holdings and watchlists; ' +
        'analyse performance, allocation, risk and investment theses.',
    permissions: [
        { key: 'portfolio.read', description: 'View portfolio' },
        { key: 'portfolio.manage', description: 'Manage holdings' },
    ],
    actions: [
        { name: 'accounts.list', description: 'List accounts', permission: 'portfolio.read' },
        { name: 'holdings.list', description: 'List holdings', permission: 'portfolio.read' },
        {
            name: 'holdings.add',
            description: 'Add or update a holding',
            permission: 'portfolio.manage',
            inputSchema: holdingInput,
        },
        {
            name: 'holdings.delete',
            description: 'Remove a holding',
            permission: 'portfolio.manage',
            inputSchema: holdingIdInput,
        },
        {
            name: 'holdings.import',
            description: 'Bulk import holdings from an external app',
            permission: 'portfolio.manage',
            inputSchema: holdingsImportInput,
        },
        { name: 'watchlist.list', description: 'List watchlist symbols', permission: 'portfolio.read' },
        {
            name: 'watchlist.add',
            description: 'Add symbol to watchlist',
            permission: 'portfolio.manage',
            inputSchema: watchlistInput,
        },
        {
            name: 'watchlist.remove',
            description: 'Remove symbol from watchlist',
            permission: 'portfolio.manage',
            inputSchema: watchlistInput.pick({ symbol: true }),
        },
        { name: 'summary', description: 'Portfolio summary + allocation', permission: 'portfolio.read' },
        {
            name: 'analyze',
            description: 'AI analysis of allocation and risk',
            permission: 'portfolio.read',
        },
        {
            name: 'prices.refresh',
            description: 'Refresh market prices for held symbols',
            permission: 'portfolio.manage',
        },
        {
            name: 'sync.export',
            description: 'Export holdings for external sync',
            permission: 'portfolio.read',
        },
        {
            name: 'sync.pull',
            description: 'Pull holdings from connected external app',
            permission: 'portfolio.manage',
        },
        {
            name: 'sync.push',
            description: 'Push holdings to connected external app',
            permission: 'portfolio.manage',
        },
        {
            name: 'sync.status',
            description: 'External sync connection status',
            permission: 'portfolio.read',
        },
    ],
    events: [
        {
            type: contracts_1.CoreEvents.PortfolioUpdated,
            direction: 'publish',
            version: 1,
            description: 'Emitted when holdings change',
        },
    ],
    settings: [
        {
            key: 'baseCurrency',
            type: 'string',
            label: 'Base currency',
            default: 'ZAR',
        },
        {
            key: 'syncEnabled',
            type: 'boolean',
            label: 'Enable external sync',
            default: false,
        },
        {
            key: 'externalSyncUrl',
            type: 'string',
            label: 'External app sync URL',
            description: 'Your app endpoint — must accept GET and POST portfolio sync payloads',
        },
        {
            key: 'syncAppName',
            type: 'string',
            label: 'Connected app name',
        },
        {
            key: 'syncApiKey',
            type: 'secret',
            label: 'Shared sync API key',
            secret: true,
        },
    ],
    widgets: [
        {
            id: 'portfolio',
            title: 'Portfolio',
            component: 'PortfolioWidget',
            defaultSize: 'lg',
            permission: 'portfolio.read',
            dataAction: 'summary',
        },
    ],
};
function createPortfolioModule() {
    let ctx;
    const loadHoldings = async () => {
        const items = await ctx.storage.list('holding:');
        return items.map((i) => i.value);
    };
    const loadWatchlist = async () => {
        const items = await ctx.storage.list('watch:');
        return items.map((i) => i.value);
    };
    const loadSyncMeta = async () => {
        const row = await ctx.storage.get('sync:meta');
        return row ?? {};
    };
    const saveSyncMeta = async (patch) => {
        const current = await loadSyncMeta();
        await ctx.storage.set('sync:meta', { ...current, ...patch });
    };
    const currency = async () => (await ctx.config.get('baseCurrency')) ?? 'ZAR';
    const syncConfig = async () => {
        const syncEnabled = (await ctx.config.get('syncEnabled')) ?? false;
        const externalSyncUrl = (await ctx.config.get('externalSyncUrl')) ?? '';
        const syncAppName = (await ctx.config.get('syncAppName')) ?? '';
        const syncApiKey = (await ctx.config.getSecret('syncApiKey')) ?? '';
        return { syncEnabled, externalSyncUrl, syncAppName, syncApiKey };
    };
    const maybePushSync = async (traceId, actorId) => {
        const { syncEnabled, externalSyncUrl, syncApiKey } = await syncConfig();
        if (!syncEnabled || !externalSyncUrl || !syncApiKey)
            return;
        try {
            const holdings = await loadHoldings();
            const watchlist = await loadWatchlist();
            const payload = (0, sync_1.buildSyncPayload)(holdings, watchlist);
            await (0, sync_1.pushExternalSync)(externalSyncUrl, syncApiKey, payload);
            await saveSyncMeta({ lastPushAt: new Date().toISOString(), lastError: undefined });
        }
        catch (err) {
            await saveSyncMeta({ lastError: err.message });
        }
    };
    const applyImport = async (input, call) => {
        const local = await loadHoldings();
        const merged = (0, sync_1.mergeHoldings)(local, input.holdings);
        const mergedIds = new Set(merged.map((h) => h.id));
        if (input.replace) {
            for (const h of local) {
                if (!mergedIds.has(h.id)) {
                    await ctx.storage.delete(`holding:${h.id}`);
                }
            }
        }
        for (const h of merged) {
            await ctx.storage.set(`holding:${h.id}`, h);
        }
        if (input.watchlist) {
            for (const w of input.watchlist) {
                const item = {
                    id: w.symbol.toUpperCase(),
                    symbol: w.symbol.toUpperCase(),
                    note: w.note,
                    addedAt: new Date().toISOString(),
                };
                await ctx.storage.set(`watch:${item.id}`, item);
            }
        }
        await ctx.events.publish(contracts_1.CoreEvents.PortfolioUpdated, { bulk: true, count: merged.length, source: input.source ?? 'manual' }, { traceId: call.traceId, actorId: call.principal.id });
        if (input.source === 'webhook') {
            await saveSyncMeta({ lastWebhookAt: new Date().toISOString(), lastError: undefined });
        }
        return { imported: merged.length, holdings: merged.length };
    };
    return {
        manifest,
        async onInstall(c) {
            ctx = c;
        },
        async onEnable(c) {
            ctx = c;
        },
        async onDisable() { },
        async onUninstall() { },
        async handle(action, input, call) {
            switch (action) {
                case 'accounts.list':
                    return sync_1.ACCOUNTS;
                case 'holdings.list':
                    return loadHoldings();
                case 'holdings.add': {
                    const data = holdingInput.parse(input);
                    const holding = {
                        ...data,
                        id: `${data.account}:${data.symbol.toUpperCase()}`,
                        symbol: data.symbol.toUpperCase(),
                        updatedAt: new Date().toISOString(),
                    };
                    await ctx.storage.set(`holding:${holding.id}`, holding);
                    await ctx.events.publish(contracts_1.CoreEvents.PortfolioUpdated, holding, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    void maybePushSync(call.traceId, call.principal.id);
                    return holding;
                }
                case 'holdings.delete': {
                    const { id } = holdingIdInput.parse(input);
                    await ctx.storage.delete(`holding:${id}`);
                    await ctx.events.publish(contracts_1.CoreEvents.PortfolioUpdated, { id, deleted: true }, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    void maybePushSync(call.traceId, call.principal.id);
                    return { deleted: true, id };
                }
                case 'holdings.import': {
                    const data = holdingsImportInput.parse(input);
                    const result = await applyImport(data, call);
                    void maybePushSync(call.traceId, call.principal.id);
                    return result;
                }
                case 'watchlist.list': {
                    const items = await loadWatchlist();
                    return items.map((i) => i.symbol);
                }
                case 'watchlist.add': {
                    const { symbol, note } = watchlistInput.parse(input);
                    const item = {
                        id: symbol.toUpperCase(),
                        symbol: symbol.toUpperCase(),
                        note,
                        addedAt: new Date().toISOString(),
                    };
                    await ctx.storage.set(`watch:${item.id}`, item);
                    void maybePushSync(call.traceId, call.principal.id);
                    return item;
                }
                case 'watchlist.remove': {
                    const { symbol } = watchlistInput.pick({ symbol: true }).parse(input);
                    await ctx.storage.delete(`watch:${symbol.toUpperCase()}`);
                    void maybePushSync(call.traceId, call.principal.id);
                    return { removed: symbol.toUpperCase() };
                }
                case 'sync.export': {
                    const holdings = await loadHoldings();
                    const watchlist = await loadWatchlist();
                    return (0, sync_1.buildSyncPayload)(holdings, watchlist);
                }
                case 'sync.status': {
                    const cfg = await syncConfig();
                    const meta = await loadSyncMeta();
                    const hasKey = Boolean(cfg.syncApiKey);
                    return {
                        connected: cfg.syncEnabled && Boolean(cfg.externalSyncUrl) && hasKey,
                        syncEnabled: cfg.syncEnabled,
                        externalSyncUrl: cfg.externalSyncUrl || null,
                        syncAppName: cfg.syncAppName || null,
                        hasApiKey: hasKey,
                        ...meta,
                        bellasosWebhookUrl: '/api/v1/integrations/portfolio/webhook',
                        bellasosExportUrl: '/api/v1/integrations/portfolio/export',
                    };
                }
                case 'sync.pull': {
                    const { syncEnabled, externalSyncUrl, syncApiKey } = await syncConfig();
                    if (!syncEnabled || !externalSyncUrl || !syncApiKey) {
                        throw new Error('Portfolio sync is not configured. Connect your app first.');
                    }
                    const remote = await (0, sync_1.fetchExternalSync)(externalSyncUrl, syncApiKey);
                    const result = await applyImport({ holdings: remote.holdings, watchlist: remote.watchlist, source: 'pull' }, call);
                    const merged = (0, sync_1.buildSyncPayload)(await loadHoldings(), await loadWatchlist());
                    await (0, sync_1.pushExternalSync)(externalSyncUrl, syncApiKey, merged);
                    await saveSyncMeta({
                        lastPullAt: new Date().toISOString(),
                        lastPushAt: new Date().toISOString(),
                        lastError: undefined,
                    });
                    return { ...result, syncedAt: merged.syncedAt };
                }
                case 'sync.push': {
                    const { syncEnabled, externalSyncUrl, syncApiKey } = await syncConfig();
                    if (!syncEnabled || !externalSyncUrl || !syncApiKey) {
                        throw new Error('Portfolio sync is not configured. Connect your app first.');
                    }
                    const payload = (0, sync_1.buildSyncPayload)(await loadHoldings(), await loadWatchlist());
                    await (0, sync_1.pushExternalSync)(externalSyncUrl, syncApiKey, payload);
                    await saveSyncMeta({ lastPushAt: new Date().toISOString(), lastError: undefined });
                    return { pushed: true, syncedAt: payload.syncedAt, holdings: payload.holdings.length };
                }
                case 'summary': {
                    const holdings = await loadHoldings();
                    const base = await currency();
                    const byAccount = {};
                    let total = 0;
                    for (const h of holdings) {
                        const value = (h.price ?? h.costBasis) * h.quantity;
                        byAccount[h.account] = (byAccount[h.account] ?? 0) + value;
                        total += value;
                    }
                    const allocation = Object.entries(byAccount).map(([account, value]) => ({
                        account,
                        value,
                        pct: total ? Number(((value / total) * 100).toFixed(1)) : 0,
                    }));
                    return { total, allocation, holdings: holdings.length, baseCurrency: base };
                }
                case 'analyze': {
                    const holdings = await loadHoldings();
                    const base = await currency();
                    const symbols = holdings.map((h) => h.symbol);
                    const ingestion = (0, core_ingestion_1.getIngestionService)();
                    const priceDocs = await ingestion.refreshPrices(symbols);
                    const newsDocs = await ingestion.pollSectorNews(symbols.slice(0, 5).map((s) => `${s} stock`));
                    const { promptBlock, sources, fetchedAt } = await ingestion.getContextForQuery(`portfolio ${symbols.join(' ')}`, ['portfolio']);
                    const priceLines = priceDocs.map((d) => d.snippet).join('\n');
                    const res = await ctx.ai.complete({
                        taskType: 'reasoning',
                        traceId: call.traceId,
                        messages: [
                            {
                                role: 'system',
                                content: `You are a portfolio risk analyst. Base currency: ${base}. ` +
                                    'Use live market/news sources below. Comment on allocation, concentration and risk.',
                            },
                            {
                                role: 'user',
                                content: `Holdings:\n${JSON.stringify(holdings)}\n\n` +
                                    `Live prices (as of ${fetchedAt}):\n${priceLines || 'No price feed'}\n\n` +
                                    `News/context:\n${promptBlock}`,
                            },
                        ],
                    });
                    return {
                        analysis: res.text,
                        baseCurrency: base,
                        sources,
                        dataAsOf: fetchedAt,
                        pricesUpdated: priceDocs.length,
                        newsItems: newsDocs.length,
                    };
                }
                case 'prices.refresh': {
                    const holdings = await loadHoldings();
                    const symbols = holdings.map((h) => h.symbol);
                    const ingestion = (0, core_ingestion_1.getIngestionService)();
                    const docs = await ingestion.refreshPrices(symbols);
                    for (const doc of docs) {
                        const sym = String(doc.metadata.symbol ?? '');
                        const price = Number(doc.metadata.price);
                        if (!sym || !price)
                            continue;
                        const existing = holdings.find((h) => h.symbol.toUpperCase() === sym);
                        if (existing) {
                            await ctx.storage.set(`holding:${existing.id}`, {
                                ...existing,
                                price,
                                updatedAt: new Date().toISOString(),
                            });
                        }
                    }
                    return { updated: docs.length, symbols: docs.map((d) => d.metadata.symbol) };
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
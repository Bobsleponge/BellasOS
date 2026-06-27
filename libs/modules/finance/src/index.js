"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFinanceModule = createFinanceModule;
const node_crypto_1 = require("node:crypto");
const contracts_1 = require("@bellasos/contracts");
const core_ingestion_1 = require("@bellasos/core-ingestion");
const account_map_1 = require("./account-map");
const analysis_1 = require("./analysis");
const types_1 = require("./types");
function num(v) {
    return typeof v === 'number' ? v : Number(v);
}
function normalizeAccountType(raw) {
    const u = raw.toUpperCase();
    if (u === 'TFSA')
        return 'TFSA';
    if (u === 'RA')
        return 'RA';
    if (u === 'PENSION')
        return 'pension';
    if (u === 'TAXABLE')
        return 'taxable';
    return 'other';
}
function normalizeInvestmentType(raw) {
    const l = raw.toLowerCase();
    if (types_1.INVESTMENT_TYPES.includes(l)) {
        return l;
    }
    return 'other';
}
function rowToInvestment(row, id) {
    const now = new Date().toISOString();
    const purchasePrice = num(row.purchase_price);
    const currentPrice = row.current_price != null ? num(row.current_price) : purchasePrice;
    return {
        id: id ?? (0, node_crypto_1.randomUUID)(),
        symbol: row.symbol.toUpperCase(),
        name: row.name,
        investmentType: normalizeInvestmentType(row.investment_type),
        accountType: normalizeAccountType(row.account_type),
        quantity: num(row.quantity),
        purchasePrice,
        currentPrice,
        purchaseDate: row.purchase_date,
        description: row.description,
        commission: row.commission != null ? num(row.commission) : undefined,
        createdAt: now,
        updatedAt: now,
    };
}
const manifest = {
    id: 'bellasos.finance',
    name: 'Finance',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Personal finance from Finance-Tracker — investments, net worth building blocks, ZAR-focused.',
    permissions: [
        { key: 'finance.read', description: 'View finance data' },
        { key: 'finance.manage', description: 'Manage finance data' },
    ],
    actions: [
        { name: 'investments.list', description: 'List investments', permission: 'finance.read' },
        {
            name: 'investments.add',
            description: 'Add investment',
            permission: 'finance.manage',
            inputSchema: types_1.investmentInput,
        },
        {
            name: 'investments.update',
            description: 'Update investment',
            permission: 'finance.manage',
            inputSchema: types_1.investmentUpdateInput,
        },
        {
            name: 'investments.delete',
            description: 'Delete investment',
            permission: 'finance.manage',
            inputSchema: types_1.investmentIdInput,
        },
        {
            name: 'investments.analyze',
            description: 'Portfolio analysis summary',
            permission: 'finance.read',
        },
        {
            name: 'investments.refreshPrices',
            description: 'Refresh market prices for investments',
            permission: 'finance.manage',
        },
        {
            name: 'investments.import',
            description: 'Import from Finance-Tracker export rows',
            permission: 'finance.manage',
            inputSchema: types_1.importInput,
        },
        {
            name: 'investments.syncToPortfolio',
            description: 'Push investments into bellasos.portfolio holdings',
            permission: 'finance.manage',
        },
        { name: 'accountTypes.list', description: 'Investment account types', permission: 'finance.read' },
        {
            name: 'investmentTypes.list',
            description: 'Investment instrument types',
            permission: 'finance.read',
        },
    ],
    events: [
        {
            type: contracts_1.CoreEvents.PortfolioUpdated,
            direction: 'publish',
            version: 1,
            description: 'Emitted when investments change',
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
            key: 'sourceApp',
            type: 'string',
            label: 'Data source',
            default: 'Finance-Tracker',
        },
    ],
    widgets: [
        {
            id: 'finance-investments',
            title: 'Investments',
            component: 'FinanceInvestmentsWidget',
            defaultSize: 'lg',
            permission: 'finance.read',
            dataAction: 'investments.analyze',
        },
    ],
};
function createFinanceModule() {
    let ctx;
    const loadInvestments = async () => {
        const items = await ctx.storage.list('investment:');
        return items
            .map((i) => i.value)
            .filter((v) => v != null &&
            typeof v === 'object' &&
            !Array.isArray(v) &&
            typeof v.symbol === 'string')
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    };
    const currency = async () => (await ctx.config.get('baseCurrency')) ?? 'ZAR';
    const saveInvestment = async (inv, call) => {
        await ctx.storage.set(`investment:${inv.id}`, inv);
        await ctx.events.publish(contracts_1.CoreEvents.PortfolioUpdated, { financeInvestmentId: inv.id, symbol: inv.symbol }, { traceId: call.traceId, actorId: call.principal.id });
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
                case 'accountTypes.list':
                    return [...types_1.ACCOUNT_TYPES];
                case 'investmentTypes.list':
                    return [...types_1.INVESTMENT_TYPES];
                case 'investments.list':
                    return loadInvestments();
                case 'investments.add': {
                    const data = types_1.investmentInput.parse(input);
                    const now = new Date().toISOString();
                    const inv = {
                        ...data,
                        id: (0, node_crypto_1.randomUUID)(),
                        symbol: data.symbol.toUpperCase(),
                        currentPrice: data.currentPrice ?? data.purchasePrice,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await saveInvestment(inv, call);
                    return inv;
                }
                case 'investments.update': {
                    const data = types_1.investmentUpdateInput.parse(input);
                    const items = await ctx.storage.list('investment:');
                    const existing = items.find((i) => i.value.id === data.id)?.value;
                    if (!existing)
                        throw new Error(`Investment not found: ${data.id}`);
                    const inv = {
                        ...existing,
                        ...data,
                        symbol: (data.symbol ?? existing.symbol).toUpperCase(),
                        currentPrice: data.currentPrice ?? existing.currentPrice,
                        updatedAt: new Date().toISOString(),
                    };
                    await saveInvestment(inv, call);
                    return inv;
                }
                case 'investments.delete': {
                    const { id } = types_1.investmentIdInput.parse(input);
                    await ctx.storage.delete(`investment:${id}`);
                    await ctx.events.publish(contracts_1.CoreEvents.PortfolioUpdated, { financeInvestmentId: id, deleted: true }, { traceId: call.traceId, actorId: call.principal.id });
                    return { deleted: true, id };
                }
                case 'investments.analyze': {
                    const investments = await loadInvestments();
                    return (0, analysis_1.analyzePortfolio)(investments, await currency());
                }
                case 'investments.refreshPrices': {
                    const investments = await loadInvestments();
                    const symbols = [...new Set(investments.map((i) => i.symbol))];
                    const ingestion = (0, core_ingestion_1.getIngestionService)();
                    const docs = await ingestion.refreshPrices(symbols);
                    let updated = 0;
                    for (const doc of docs) {
                        const sym = String(doc.metadata.symbol ?? '').toUpperCase();
                        const price = Number(doc.metadata.price);
                        if (!sym || !price)
                            continue;
                        for (const inv of investments) {
                            if (inv.symbol.toUpperCase() !== sym)
                                continue;
                            await ctx.storage.set(`investment:${inv.id}`, {
                                ...inv,
                                currentPrice: price,
                                updatedAt: new Date().toISOString(),
                            });
                            updated++;
                        }
                    }
                    return { updated, symbols: docs.map((d) => d.metadata.symbol) };
                }
                case 'investments.import': {
                    const { investments: rows, replace } = types_1.importInput.parse(input);
                    if (replace) {
                        const existing = await ctx.storage.list('investment:');
                        for (const item of existing) {
                            await ctx.storage.delete(item.key);
                        }
                    }
                    const imported = [];
                    for (const row of rows) {
                        const inv = rowToInvestment(row);
                        await saveInvestment(inv, call);
                        imported.push(inv);
                    }
                    return { imported: imported.length, investments: imported };
                }
                case 'investments.syncToPortfolio': {
                    const investments = await loadInvestments();
                    const synced = [];
                    for (const inv of investments) {
                        const holding = (0, account_map_1.investmentToHolding)(inv);
                        await ctx.call.call('bellasos.portfolio', 'holdings.add', holding, call);
                        synced.push(`${holding.account}:${holding.symbol}`);
                    }
                    return { synced: synced.length, ids: synced };
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import { getIngestionService } from '@bellasos/core-ingestion';

const ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'] as const;

const holdingInput = z.object({
  account: z.enum(ACCOUNTS),
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  costBasis: z.number().nonnegative(),
  price: z.number().nonnegative().optional(),
});

const holdingIdInput = z.object({ id: z.string().min(1) });

const watchlistInput = z.object({
  symbol: z.string().min(1),
  note: z.string().optional(),
});

interface Holding extends z.infer<typeof holdingInput> {
  id: string;
  updatedAt: string;
}

interface WatchItem {
  id: string;
  symbol: string;
  note?: string;
  addedAt: string;
}

const manifest: ModuleManifest = {
  id: 'bellasos.portfolio',
  name: 'Portfolio',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Track Trust, Personal, TFSA, Crypto and Property holdings and watchlists; ' +
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
  ],
  events: [
    {
      type: CoreEvents.PortfolioUpdated,
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

export function createPortfolioModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  const loadHoldings = async (): Promise<Holding[]> => {
    const items = await ctx.storage.list('holding:');
    return items.map((i) => i.value as Holding);
  };

  const currency = async () =>
    (await ctx.config.get<string>('baseCurrency')) ?? 'ZAR';

  return {
    manifest,
    async onInstall(c) {
      ctx = c;
    },
    async onEnable(c) {
      ctx = c;
    },
    async onDisable() {},
    async onUninstall() {},
    async handle(action: string, input: unknown, call: CallContext) {
      switch (action) {
        case 'accounts.list':
          return ACCOUNTS;
        case 'holdings.list':
          return loadHoldings();
        case 'holdings.add': {
          const data = holdingInput.parse(input);
          const holding: Holding = {
            ...data,
            id: `${data.account}:${data.symbol}`,
            updatedAt: new Date().toISOString(),
          };
          await ctx.storage.set(`holding:${holding.id}`, holding);
          await ctx.events.publish(CoreEvents.PortfolioUpdated, holding, {
            traceId: call.traceId,
            actorId: call.principal.id,
          });
          return holding;
        }
        case 'holdings.delete': {
          const { id } = holdingIdInput.parse(input);
          await ctx.storage.delete(`holding:${id}`);
          await ctx.events.publish(CoreEvents.PortfolioUpdated, { id, deleted: true }, {
            traceId: call.traceId,
            actorId: call.principal.id,
          });
          return { deleted: true, id };
        }
        case 'watchlist.list': {
          const items = await ctx.storage.list('watch:');
          return items.map((i) => i.value as WatchItem);
        }
        case 'watchlist.add': {
          const { symbol, note } = watchlistInput.parse(input);
          const item: WatchItem = {
            id: symbol.toUpperCase(),
            symbol: symbol.toUpperCase(),
            note,
            addedAt: new Date().toISOString(),
          };
          await ctx.storage.set(`watch:${item.id}`, item);
          return item;
        }
        case 'watchlist.remove': {
          const { symbol } = watchlistInput.pick({ symbol: true }).parse(input);
          await ctx.storage.delete(`watch:${symbol.toUpperCase()}`);
          return { removed: symbol.toUpperCase() };
        }
        case 'summary': {
          const holdings = await loadHoldings();
          const base = await currency();
          const byAccount: Record<string, number> = {};
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
          const ingestion = getIngestionService();
          const priceDocs = await ingestion.refreshPrices(symbols);
          const newsDocs = await ingestion.pollSectorNews(
            symbols.slice(0, 5).map((s) => `${s} stock`),
          );
          const { promptBlock, sources, fetchedAt } = await ingestion.getContextForQuery(
            `portfolio ${symbols.join(' ')}`,
            ['portfolio'],
          );
          const priceLines = priceDocs.map((d) => d.snippet).join('\n');
          const res = await ctx.ai.complete({
            taskType: 'reasoning',
            traceId: call.traceId,
            messages: [
              {
                role: 'system',
                content:
                  `You are a portfolio risk analyst. Base currency: ${base}. ` +
                  'Use live market/news sources below. Comment on allocation, concentration and risk.',
              },
              {
                role: 'user',
                content:
                  `Holdings:\n${JSON.stringify(holdings)}\n\n` +
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
          const ingestion = getIngestionService();
          const docs = await ingestion.refreshPrices(symbols);
          for (const doc of docs) {
            const sym = String(doc.metadata.symbol ?? '');
            const price = Number(doc.metadata.price);
            if (!sym || !price) continue;
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

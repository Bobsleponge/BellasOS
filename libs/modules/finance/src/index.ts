import { randomUUID } from 'node:crypto';
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
import { investmentToHolding } from './account-map';
import { analyzePortfolio } from './analysis';
import { runPortfolioAdvisePipeline } from './advise';
import {
  ACCOUNT_TYPES,
  importInput,
  investmentIdInput,
  investmentInput,
  investmentUpdateInput,
  INVESTMENT_TYPES,
  trackerRowInput,
  type Investment,
} from './types';

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

function normalizeAccountType(raw: string): (typeof ACCOUNT_TYPES)[number] {
  const u = raw.toUpperCase();
  if (u === 'TFSA') return 'TFSA';
  if (u === 'RA') return 'RA';
  if (u === 'PENSION') return 'pension';
  if (u === 'TAXABLE') return 'taxable';
  return 'other';
}

function normalizeInvestmentType(raw: string): (typeof INVESTMENT_TYPES)[number] {
  const l = raw.toLowerCase();
  if ((INVESTMENT_TYPES as readonly string[]).includes(l)) {
    return l as (typeof INVESTMENT_TYPES)[number];
  }
  return 'other';
}

function rowToInvestment(row: ReturnType<typeof trackerRowInput.parse>, id?: string): Investment {
  const now = new Date().toISOString();
  const purchasePrice = num(row.purchase_price);
  const currentPrice = row.current_price != null ? num(row.current_price) : purchasePrice;
  return {
    id: id ?? randomUUID(),
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

const manifest: ModuleManifest = {
  id: 'bellasos.finance',
  name: 'Finance',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Personal finance from Finance-Tracker — investments, net worth building blocks, ZAR-focused.',
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
      inputSchema: investmentInput,
    },
    {
      name: 'investments.update',
      description: 'Update investment',
      permission: 'finance.manage',
      inputSchema: investmentUpdateInput,
    },
    {
      name: 'investments.delete',
      description: 'Delete investment',
      permission: 'finance.manage',
      inputSchema: investmentIdInput,
    },
    {
      name: 'investments.analyze',
      description: 'Portfolio analysis summary',
      permission: 'finance.read',
    },
    {
      name: 'portfolio.advise',
      description: 'Hybrid portfolio advice (OpenAI lead/review, local narrative)',
      permission: 'finance.read',
      inputSchema: z.object({ question: z.string().optional() }),
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
      inputSchema: importInput,
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
      type: CoreEvents.PortfolioUpdated,
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

export function createFinanceModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  const loadInvestments = async (): Promise<Investment[]> => {
    const items = await ctx.storage.list('investment:');
    return items
      .map((i) => i.value)
      .filter(
        (v): v is Investment =>
          v != null &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof (v as Investment).symbol === 'string',
      )
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  };

  const currency = async () => (await ctx.config.get<string>('baseCurrency')) ?? 'ZAR';

  const saveInvestment = async (inv: Investment, call: CallContext) => {
    await ctx.storage.set(`investment:${inv.id}`, inv);
    await ctx.events.publish(
      CoreEvents.PortfolioUpdated,
      { financeInvestmentId: inv.id, symbol: inv.symbol },
      { traceId: call.traceId, actorId: call.principal.id },
    );
  };

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
        case 'accountTypes.list':
          return [...ACCOUNT_TYPES];
        case 'investmentTypes.list':
          return [...INVESTMENT_TYPES];
        case 'investments.list':
          return loadInvestments();
        case 'investments.add': {
          const data = investmentInput.parse(input);
          const now = new Date().toISOString();
          const inv: Investment = {
            ...data,
            id: randomUUID(),
            symbol: data.symbol.toUpperCase(),
            currentPrice: data.currentPrice ?? data.purchasePrice,
            createdAt: now,
            updatedAt: now,
          };
          await saveInvestment(inv, call);
          return inv;
        }
        case 'investments.update': {
          const data = investmentUpdateInput.parse(input);
          const items = await ctx.storage.list('investment:');
          const existing = items.find((i) => (i.value as Investment).id === data.id)?.value as
            | Investment
            | undefined;
          if (!existing) throw new Error(`Investment not found: ${data.id}`);
          const inv: Investment = {
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
          const { id } = investmentIdInput.parse(input);
          await ctx.storage.delete(`investment:${id}`);
          await ctx.events.publish(
            CoreEvents.PortfolioUpdated,
            { financeInvestmentId: id, deleted: true },
            { traceId: call.traceId, actorId: call.principal.id },
          );
          return { deleted: true, id };
        }
        case 'investments.analyze': {
          const investments = await loadInvestments();
          return analyzePortfolio(investments, await currency());
        }
        case 'portfolio.advise': {
          const { question } = z.object({ question: z.string().optional() }).parse(input ?? {});
          const investments = await loadInvestments();
          const analysis = analyzePortfolio(investments, await currency());
          const hybrid = await runPortfolioAdvisePipeline(ctx.ai, {
            traceId: call.traceId,
            analysis,
            question,
          });
          return {
            analysis,
            advice: hybrid.content,
            hybrid: hybrid.meta,
          };
        }
        case 'investments.refreshPrices': {
          const investments = await loadInvestments();
          const symbols = [...new Set(investments.map((i) => i.symbol))];
          const ingestion = getIngestionService();
          const docs = await ingestion.refreshPrices(symbols);
          let updated = 0;
          for (const doc of docs) {
            const sym = String(doc.metadata.symbol ?? '').toUpperCase();
            const price = Number(doc.metadata.price);
            if (!sym || !price) continue;
            for (const inv of investments) {
              if (inv.symbol.toUpperCase() !== sym) continue;
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
          const { investments: rows, replace } = importInput.parse(input);
          if (replace) {
            const existing = await ctx.storage.list('investment:');
            for (const item of existing) {
              await ctx.storage.delete(item.key);
            }
          }
          const imported: Investment[] = [];
          for (const row of rows) {
            const inv = rowToInvestment(row);
            await saveInvestment(inv, call);
            imported.push(inv);
          }
          return { imported: imported.length, investments: imported };
        }
        case 'investments.syncToPortfolio': {
          const investments = await loadInvestments();
          const synced: string[] = [];
          for (const inv of investments) {
            const holding = investmentToHolding(inv);
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

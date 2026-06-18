import {
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import { investmentToHolding } from './account-map';
import { createFinanceTrackerClient } from './client';
import {
  expenseAddInput,
  incomeAddInput,
  investmentAddInput,
  limitInput,
  transferAddInput,
  exchangeRateInput,
  quoteInput,
  symbolSearchInput,
} from './types';

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

function sumAmount(rows: Array<{ amount?: number; net_amount?: number; value?: number; current_balance?: number }>, field: 'amount' | 'net_amount' | 'value' | 'current_balance') {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
}

const manifest: ModuleManifest = {
  id: 'bellasos.finance-tracker',
  name: 'Finance Tracker Live',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Live bridge to Finance-Tracker — read/write assets, liabilities, income, expenses, investments.',
  permissions: [
    { key: 'finance-tracker.read', description: 'Read live finance data' },
    { key: 'finance-tracker.manage', description: 'Write live finance data' },
  ],
  actions: [
    { name: 'connection.status', description: 'Check Finance-Tracker connectivity', permission: 'finance-tracker.read' },
    { name: 'summary.get', description: 'Net worth and cashflow summary', permission: 'finance-tracker.read' },
    { name: 'transactions.recent', description: 'Recent income, expenses, transfers', permission: 'finance-tracker.read', inputSchema: limitInput },
    { name: 'income.list', description: 'List income records', permission: 'finance-tracker.read' },
    { name: 'expenses.list', description: 'List expense records', permission: 'finance-tracker.read' },
    { name: 'assets.list', description: 'List assets', permission: 'finance-tracker.read' },
    { name: 'liabilities.list', description: 'List liabilities', permission: 'finance-tracker.read' },
    { name: 'investments.list', description: 'List investments', permission: 'finance-tracker.read' },
    { name: 'investments.quote.get', description: 'Live/historical stock quote', permission: 'finance-tracker.read', inputSchema: quoteInput },
    { name: 'investments.search', description: 'Live symbol search (Yahoo Finance)', permission: 'finance-tracker.read', inputSchema: symbolSearchInput },
    { name: 'currency.exchangeRate.get', description: 'USD/ZAR exchange rate', permission: 'finance-tracker.read', inputSchema: exchangeRateInput },
    { name: 'investments.add', description: 'Record investment purchase (smart transaction)', permission: 'finance-tracker.manage', inputSchema: investmentAddInput },
    { name: 'transfers.list', description: 'List account transfers', permission: 'finance-tracker.read' },
    { name: 'income.add', description: 'Record income', permission: 'finance-tracker.manage', inputSchema: incomeAddInput },
    { name: 'expenses.add', description: 'Record expense', permission: 'finance-tracker.manage', inputSchema: expenseAddInput },
    { name: 'transfers.add', description: 'Record account transfer', permission: 'finance-tracker.manage', inputSchema: transferAddInput },
    { name: 'investments.syncToPortfolio', description: 'Sync live investments into bellasos.portfolio', permission: 'finance-tracker.manage' },
  ],
  events: [],
  settings: [
    { key: 'baseUrl', type: 'string', label: 'Finance-Tracker URL', default: 'http://localhost:5000' },
    { key: 'apiKey', type: 'secret', label: 'API Key', secret: true },
  ],
};

async function resolveClient(ctx: ModuleContext) {
  const baseUrl =
    (await ctx.config.get<string>('baseUrl')) ??
    process.env.FINANCE_TRACKER_URL ??
    process.env.NEXT_PUBLIC_FINANCE_TRACKER_URL ??
    'http://localhost:5000';
  const apiKey =
    (await ctx.config.getSecret('apiKey')) ?? process.env.FINANCE_TRACKER_API_KEY;
  return createFinanceTrackerClient({ baseUrl, apiKey });
}

export function createFinanceTrackerModule(): ModuleRuntime {
  let ctx!: ModuleContext;
  const client = () => resolveClient(ctx);

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
        case 'connection.status': {
          try {
            const ft = await client();
            const cfg = ft.config;
            if (!cfg.hasApiKey) {
              return {
                connected: false,
                baseUrl: cfg.baseUrl,
                authMode: 'api_key',
                error: 'API key not configured. Add it in Command Centre → Portfolio.',
              };
            }
            const health = await ft.ping();
            const verified = await ft.verifyConnection();
            return {
              connected: true,
              baseUrl: cfg.baseUrl,
              authMode: 'api_key',
              service: verified.service,
              user: verified.user,
              database: health,
            };
          } catch (err) {
            const ft = await client();
            return {
              connected: false,
              baseUrl: ft.config.baseUrl,
              authMode: 'api_key',
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }
        case 'summary.get': {
          const ft = await client();
          const [assets, liabilities, incomes, expenses, investments, exchange] = await Promise.all([
            ft.request<Array<{ value?: number }>>('/api/assets'),
            ft.request<Array<{ current_balance?: number; amount?: number }>>('/api/liabilities'),
            ft.request<Array<{ net_amount?: number; type?: string }>>('/api/income'),
            ft.request<Array<{ amount?: number; category?: string }>>('/api/expenses'),
            ft.request<Array<{ quantity?: number; current_price?: number; purchase_price?: number }>>('/api/investments'),
            ft.request<{ rate?: number; source?: string }>('/api/currency/exchange-rate', { auth: false }).catch(() => null),
          ]);

          const totalAssets = sumAmount(assets, 'value');
          const totalLiabilities = liabilities.reduce(
            (sum, l) => sum + Number(l.current_balance ?? l.amount ?? 0),
            0,
          );
          const totalIncome = incomes
            .filter((i) => i.type !== 'transfer')
            .reduce((sum, i) => sum + Number(i.net_amount ?? 0), 0);
          const totalExpenses = expenses
            .filter((e) => e.category !== 'transfer')
            .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
          const investmentValue = investments.reduce(
            (sum, inv) => sum + Number(inv.quantity ?? 0) * Number(inv.current_price ?? inv.purchase_price ?? 0),
            0,
          );

          return {
            currency: 'ZAR',
            totalAssets,
            totalLiabilities,
            investmentValue,
            netWorth: totalAssets + investmentValue - totalLiabilities,
            totalIncome,
            totalExpenses,
            netCashflow: totalIncome - totalExpenses,
            counts: {
              assets: assets.length,
              liabilities: liabilities.length,
              investments: investments.length,
              incomeRecords: incomes.length,
              expenseRecords: expenses.length,
            },
            exchangeRateUsdZar: exchange?.rate ?? null,
            exchangeSource: exchange?.source ?? null,
            asOf: new Date().toISOString(),
          };
        }
        case 'transactions.recent': {
          const { limit = 20 } = limitInput.parse(input ?? {});
          const ft = await client();
          return ft.request(`/api/transactions?limit=${limit}`);
        }
        case 'income.list':
          return (await client()).request('/api/income');
        case 'expenses.list':
          return (await client()).request('/api/expenses');
        case 'assets.list':
          return (await client()).request('/api/assets');
        case 'liabilities.list':
          return (await client()).request('/api/liabilities');
        case 'investments.list':
          return (await client()).request('/api/investments');
        case 'currency.exchangeRate.get': {
          const { date } = exchangeRateInput.parse(input ?? {});
          const ft = await client();
          const path = date
            ? `/api/currency/exchange-rate?date=${encodeURIComponent(date)}`
            : '/api/currency/exchange-rate';
          return ft.request(path, { auth: false });
        }
        case 'investments.quote.get': {
          const data = quoteInput.parse(input);
          const ft = await client();
          const params = new URLSearchParams({ symbol: data.symbol.toUpperCase() });
          if (data.date) params.set('date', data.date);
          return ft.request(`/api/investments/quote?${params.toString()}`);
        }
        case 'investments.search': {
          const { query } = symbolSearchInput.parse(input);
          const ft = await client();
          return ft.request(`/api/investments/search-stocks?q=${encodeURIComponent(query)}`);
        }
        case 'investments.add': {
          const data = investmentAddInput.parse(input);
          const ft = await client();
          let quantity = data.quantity;
          let purchasePrice = data.purchasePrice;
          let name = data.name;
          const symbol = data.symbol.toUpperCase();
          const accountType = data.accountType;

          if (data.amountZar != null && quantity == null) {
            const purchaseDate = data.purchaseDate ?? todayIso();
            const quoteQuery = data.purchaseDate
              ? `symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(purchaseDate)}`
              : `symbol=${encodeURIComponent(symbol)}`;
            const quote = await ft.request<{
              price?: number;
              open?: number;
              currency?: string;
              name?: string;
              source?: string;
              date?: string;
            }>(`/api/investments/quote?${quoteQuery}`);
            const fxQuery = data.purchaseDate
              ? `/api/currency/exchange-rate?date=${encodeURIComponent(purchaseDate)}`
              : '/api/currency/exchange-rate';
            const exchange = await ft
              .request<{ rate?: number; source?: string }>(fxQuery, { auth: false })
              .catch(() => ({ rate: 18 }));
            const priceUsd = purchasePrice ?? quote.open ?? quote.price;
            if (!priceUsd) {
              throw new Error(`Could not get opening price for ${symbol} on ${purchaseDate}`);
            }
            name = name ?? quote.name ?? symbol;
            const zarPerShare =
              quote.currency === 'ZAR' ? priceUsd : priceUsd * (exchange.rate ?? 18);
            quantity = Math.round((data.amountZar / zarPerShare) * 10000) / 10000;
            purchasePrice = priceUsd;
          }

          if (quantity == null || purchasePrice == null) {
            throw new Error('Could not determine quantity and purchase price');
          }

          const existingRows = await ft.request<
            Array<{
              id: number;
              symbol: string;
              name: string;
              investment_type: string;
              account_type: string;
              quantity: number;
              purchase_price: number;
              current_price: number;
              purchase_date: string;
              description: string;
            }>
          >('/api/investments');
          const existing = existingRows.find(
            (row) =>
              row.symbol.toUpperCase() === symbol &&
              String(row.account_type).toLowerCase() === String(accountType).toLowerCase(),
          );

          if (existing) {
            const newQuantity = existing.quantity + quantity;
            const totalCost =
              existing.quantity * existing.purchase_price + quantity * purchasePrice;
            const avgPrice = totalCost / newQuantity;
            return ft.request(`/api/investments/${existing.id}`, {
              method: 'PUT',
              body: {
                symbol,
                name: name ?? existing.name,
                investmentType: data.investmentType,
                accountType,
                quantity: newQuantity,
                purchasePrice: avgPrice,
                currentPrice: purchasePrice,
                purchaseDate: data.purchaseDate ?? existing.purchase_date,
                description:
                  data.description ??
                  `${existing.description || ''} + purchase ${quantity} @ ${purchasePrice}`.trim(),
              },
            });
          }

          return ft.request('/api/investments', {
            method: 'POST',
            body: {
              symbol,
              name: name ?? symbol,
              investmentType: data.investmentType,
              accountType,
              quantity,
              purchasePrice,
              currentPrice: purchasePrice,
              purchaseDate: data.purchaseDate ?? todayIso(),
              description: data.description ?? `Investment purchase — ${symbol}`,
              commission: data.commission ?? 0,
            },
          });
        }
        case 'transfers.list':
          return (await client()).request('/api/transfers');
        case 'income.add': {
          const data = incomeAddInput.parse(input);
          const ft = await client();
          const date = data.date ?? todayIso();
          const amount = data.amount;
          const paye = data.paye_amount ?? 0;
          const net = data.net_amount ?? (data.is_gross ? amount - paye : amount);
          return ft.request('/api/income', {
            method: 'POST',
            body: {
              amount,
              type: data.type,
              is_gross: data.is_gross ?? false,
              paye_amount: paye,
              net_amount: net,
              description: data.description ?? `${data.type} income`,
              date,
              merchant: data.merchant,
              payment_method: data.payment_method,
            },
          });
        }
        case 'expenses.add': {
          const data = expenseAddInput.parse(input);
          const ft = await client();
          return ft.request('/api/expenses', {
            method: 'POST',
            body: {
              amount: data.amount,
              category: data.category,
              description: data.description ?? data.category,
              date: data.date ?? todayIso(),
              merchant: data.merchant,
              payment_method: data.payment_method,
              is_recurring: data.is_recurring ?? false,
              recurring_frequency: data.recurring_frequency,
            },
          });
        }
        case 'transfers.add': {
          const data = transferAddInput.parse(input);
          const ft = await client();
          return ft.request('/api/transfers', {
            method: 'POST',
            body: {
              amount: data.amount,
              transfer_fee: data.transfer_fee ?? 0,
              source_account: data.source_account,
              destination_account: data.destination_account,
              purpose: data.purpose ?? 'general',
              description: data.description,
              date: data.date ?? todayIso(),
            },
          });
        }
        case 'investments.syncToPortfolio': {
          const ft = await client();
          const rows = await ft.request<
            Array<{
              symbol: string;
              investment_type?: string;
              account_type?: string;
              quantity: number;
              purchase_price: number;
              current_price: number;
              updated_at?: string;
            }>
          >('/api/investments');
          const synced: string[] = [];
          for (const inv of rows) {
            const holding = investmentToHolding({
              symbol: inv.symbol,
              investmentType: inv.investment_type ?? 'stock',
              accountType: inv.account_type ?? 'TAXABLE',
              quantity: Number(inv.quantity),
              purchasePrice: Number(inv.purchase_price),
              currentPrice: Number(inv.current_price ?? inv.purchase_price),
              updatedAt: inv.updated_at ?? new Date().toISOString(),
            });
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

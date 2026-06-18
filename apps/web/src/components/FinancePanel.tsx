'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { financeKeys, queryKeys } from '@/lib/queryKeys';
import { shellAppUrl } from '@/lib/navigation';
import {
  normalizeInvestmentsList,
  parseFinanceTrackerImportJson,
  type FinanceInvestment,
} from '@/lib/financeInvestments';
import { Panel, Stat } from './Panel';

const ACCOUNT_TYPES = ['TFSA', 'RA', 'taxable', 'pension', 'other'] as const;
const INVESTMENT_TYPES = ['stock', 'etf', 'bond', 'crypto', 'mutual_fund', 'other'] as const;

interface Investment extends FinanceInvestment {}

interface PortfolioAnalysis {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  recommendations: string[];
  holdings: number;
  baseCurrency: string;
  diversification: { byAccount: Record<string, number> };
}

export function FinanceInvestmentsSummary() {
  const { data: analysis } = useQuery({
    queryKey: queryKeys.financeAnalysis,
    queryFn: () =>
      api.invoke<PortfolioAnalysis>('bellasos.finance', 'investments.analyze', {}),
  });
  const { data: investmentsRaw } = useQuery({
    queryKey: queryKeys.financeInvestments,
    queryFn: () =>
      api.invoke<Investment[]>('bellasos.finance', 'investments.list', {}),
  });
  const investments = normalizeInvestmentsList(investmentsRaw);

  return (
    <Panel title="Investments" subtitle="Finance-Tracker (ingested)">
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat
            label="Total value"
            value={`${analysis.baseCurrency} ${analysis.totalValue.toLocaleString()}`}
          />
          <Stat
            label="Total gain"
            value={`${analysis.totalGainPercent >= 0 ? '+' : ''}${analysis.totalGainPercent.toFixed(1)}%`}
          />
          <Stat label="Holdings" value={String(analysis.holdings)} />
          <Stat label="Invested" value={analysis.totalInvested.toLocaleString()} />
        </div>
      )}
      <ul className="space-y-1 max-h-36 overflow-auto mb-3">
        {investments.slice(0, 8).map((inv) => (
          <li key={inv.id} className="flex justify-between text-sm border-b border-edge/40 pb-1">
            <span>
              {inv.symbol} · {inv.accountType} × {inv.quantity}
            </span>
            <span className="text-muted">
              {(inv.quantity * inv.currentPrice).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </li>
        ))}
        {!investments.length && (
          <li className="text-xs text-muted">
            No investments yet — import from Finance-Tracker or add in Finance app.
          </li>
        )}
      </ul>
      <Link
        href={shellAppUrl('bellasos.portfolio')}
        className="text-xs text-accent hover:underline"
      >
        Open full Finance app
      </Link>
    </Panel>
  );
}

export function FinancePanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('TFSA');
  const [investmentType, setInvestmentType] = useState<string>('stock');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));

  const invalidate = () => {
    for (const key of financeKeys) qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: queryKeys.widgets });
  };

  const { data: investmentsRaw } = useQuery({
    queryKey: queryKeys.financeInvestments,
    queryFn: () =>
      api.invoke<Investment[]>('bellasos.finance', 'investments.list', {}),
  });
  const investments = normalizeInvestmentsList(investmentsRaw);
  const { data: analysis } = useQuery({
    queryKey: queryKeys.financeAnalysis,
    queryFn: () =>
      api.invoke<PortfolioAnalysis>('bellasos.finance', 'investments.analyze', {}),
  });

  const add = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.finance', 'investments.add', {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        accountType,
        investmentType,
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        currentPrice: currentPrice ? Number(currentPrice) : undefined,
        purchaseDate,
      }),
    onSuccess: () => {
      invalidate();
      setSymbol('');
      setName('');
    },
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      api.invoke('bellasos.finance', 'investments.delete', { id }),
    onSuccess: invalidate,
  });

  const refreshPrices = useMutation({
    mutationFn: () => api.invoke('bellasos.finance', 'investments.refreshPrices', {}),
    onSuccess: invalidate,
  });

  const syncPortfolio = useMutation({
    mutationFn: () => api.invoke('bellasos.finance', 'investments.syncToPortfolio', {}),
    onSuccess: invalidate,
  });

  const importJson = useMutation({
    mutationFn: (rows: unknown[]) =>
      api.invoke('bellasos.finance', 'investments.import', {
        investments: rows,
        replace: false,
      }),
    onSuccess: invalidate,
  });

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const rows = parseFinanceTrackerImportJson(parsed);
    await importJson.mutateAsync(rows);
  };

  return (
    <>
      {analysis && (
        <Panel title="Portfolio analysis" subtitle="bellasos.finance">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Stat
              label="Total value"
              value={`${analysis.baseCurrency} ${analysis.totalValue.toLocaleString()}`}
            />
            <Stat
              label="Gain"
              value={`${analysis.totalGain.toLocaleString()} (${analysis.totalGainPercent}%)`}
            />
            <Stat label="Holdings" value={String(analysis.holdings)} />
            <Stat label="Invested" value={analysis.totalInvested.toLocaleString()} />
          </div>
          <ul className="text-xs text-muted space-y-1">
            {analysis.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Import from Finance-Tracker" subtitle="SQLite export or JSON">
        <p className="text-xs text-muted mb-2">
          Run node scripts/import-finance-tracker.mjs from the BellasOS repo, or upload a JSON
          export of your investments table.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f).catch(console.error);
            e.target.value = '';
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importJson.isPending}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
          >
            {importJson.isPending ? 'Importing...' : 'Upload JSON'}
          </button>
          <button
            type="button"
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
          >
            {refreshPrices.isPending ? 'Refreshing...' : 'Refresh prices'}
          </button>
          <button
            type="button"
            onClick={() => syncPortfolio.mutate()}
            disabled={syncPortfolio.isPending}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
          >
            {syncPortfolio.isPending ? 'Syncing...' : 'Sync to Portfolio'}
          </button>
        </div>
      </Panel>

      <Panel title="Add investment" subtitle="bellasos.finance">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {ACCOUNT_TYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={investmentType}
            onChange={(e) => setInvestmentType(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {INVESTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="Purchase price"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            placeholder="Current price (optional)"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => add.mutate()}
            disabled={!symbol || !purchasePrice || add.isPending}
            className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </Panel>

      <Panel title="Holdings" subtitle={`${investments.length} positions`}>
        <ul className="space-y-2 max-h-64 overflow-auto">
          {investments.map((inv) => {
            const value = inv.quantity * inv.currentPrice;
            const gainPct =
              inv.purchasePrice > 0
                ? ((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100
                : 0;
            return (
              <li
                key={inv.id}
                className="flex justify-between items-start text-sm border-b border-edge/60 pb-2"
              >
                <div>
                  <div className="font-medium text-white">
                    {inv.symbol}{' '}
                    <span className="text-muted font-normal">{inv.name}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {inv.accountType} · {inv.investmentType} · {inv.quantity} @{' '}
                    {inv.currentPrice.toFixed(2)}
                  </div>
                  <div className={`text-xs ${gainPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {gainPct >= 0 ? '+' : ''}
                    {gainPct.toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div>{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <button
                    type="button"
                    onClick={() => del.mutate(inv.id)}
                    className="text-xs text-muted hover:text-red-400 mt-1"
                  >
                    delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

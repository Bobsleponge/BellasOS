import { z } from 'zod';

export const ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'] as const;

export const syncHoldingSchema = z.object({
  account: z.enum(ACCOUNTS),
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  costBasis: z.number().nonnegative(),
  price: z.number().nonnegative().optional(),
  updatedAt: z.string().optional(),
});

export const portfolioSyncPayloadSchema = z.object({
  holdings: z.array(syncHoldingSchema),
  watchlist: z
    .array(z.object({ symbol: z.string().min(1), note: z.string().optional() }))
    .optional(),
  syncedAt: z.string(),
});

export type SyncHolding = z.infer<typeof syncHoldingSchema>;
export type PortfolioSyncPayload = z.infer<typeof portfolioSyncPayloadSchema>;

export interface StoredHolding extends SyncHolding {
  id: string;
  updatedAt: string;
}

export interface SyncMeta {
  lastPullAt?: string;
  lastPushAt?: string;
  lastWebhookAt?: string;
  lastError?: string;
  connectedApp?: string;
}

export function holdingId(account: string, symbol: string): string {
  return `${account}:${symbol.toUpperCase()}`;
}

export function toStoredHolding(input: SyncHolding): StoredHolding {
  const symbol = input.symbol.toUpperCase();
  return {
    ...input,
    symbol,
    id: holdingId(input.account, symbol),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

/** Merge remote holdings into local using newest updatedAt per position. */
export function mergeHoldings(local: StoredHolding[], remote: SyncHolding[]): StoredHolding[] {
  const map = new Map<string, StoredHolding>();
  for (const h of local) map.set(h.id, h);

  for (const incoming of remote) {
    const next = toStoredHolding(incoming);
    const existing = map.get(next.id);
    if (!existing) {
      map.set(next.id, next);
      continue;
    }
    const remoteTs = Date.parse(next.updatedAt);
    const localTs = Date.parse(existing.updatedAt);
    if (remoteTs >= localTs) {
      map.set(next.id, { ...existing, ...next, id: next.id });
    }
  }

  return Array.from(map.values());
}

export function buildSyncPayload(
  holdings: StoredHolding[],
  watchlist: Array<{ symbol: string; note?: string }>,
): PortfolioSyncPayload {
  return {
    holdings: holdings.map(({ account, symbol, quantity, costBasis, price, updatedAt }) => ({
      account,
      symbol,
      quantity,
      costBasis,
      price,
      updatedAt,
    })),
    watchlist: watchlist.map((w) => ({ symbol: w.symbol, note: w.note })),
    syncedAt: new Date().toISOString(),
  };
}

export async function fetchExternalSync(
  syncUrl: string,
  apiKey: string,
): Promise<PortfolioSyncPayload> {
  const res = await fetch(syncUrl, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
      'x-bellasos-sync-key': apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`External sync GET failed (${res.status}): ${await res.text()}`);
  }
  return portfolioSyncPayloadSchema.parse(await res.json());
}

export async function pushExternalSync(
  syncUrl: string,
  apiKey: string,
  payload: PortfolioSyncPayload,
): Promise<void> {
  const res = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'x-bellasos-sync-key': apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`External sync POST failed (${res.status}): ${await res.text()}`);
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioSyncPayloadSchema = exports.syncHoldingSchema = exports.ACCOUNTS = void 0;
exports.holdingId = holdingId;
exports.toStoredHolding = toStoredHolding;
exports.mergeHoldings = mergeHoldings;
exports.buildSyncPayload = buildSyncPayload;
exports.fetchExternalSync = fetchExternalSync;
exports.pushExternalSync = pushExternalSync;
const zod_1 = require("zod");
exports.ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'];
exports.syncHoldingSchema = zod_1.z.object({
    account: zod_1.z.enum(exports.ACCOUNTS),
    symbol: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive(),
    costBasis: zod_1.z.number().nonnegative(),
    price: zod_1.z.number().nonnegative().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.portfolioSyncPayloadSchema = zod_1.z.object({
    holdings: zod_1.z.array(exports.syncHoldingSchema),
    watchlist: zod_1.z
        .array(zod_1.z.object({ symbol: zod_1.z.string().min(1), note: zod_1.z.string().optional() }))
        .optional(),
    syncedAt: zod_1.z.string(),
});
function holdingId(account, symbol) {
    return `${account}:${symbol.toUpperCase()}`;
}
function toStoredHolding(input) {
    const symbol = input.symbol.toUpperCase();
    return {
        ...input,
        symbol,
        id: holdingId(input.account, symbol),
        updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
}
/** Merge remote holdings into local using newest updatedAt per position. */
function mergeHoldings(local, remote) {
    const map = new Map();
    for (const h of local)
        map.set(h.id, h);
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
function buildSyncPayload(holdings, watchlist) {
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
async function fetchExternalSync(syncUrl, apiKey) {
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
    return exports.portfolioSyncPayloadSchema.parse(await res.json());
}
async function pushExternalSync(syncUrl, apiKey, payload) {
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
//# sourceMappingURL=sync.js.map
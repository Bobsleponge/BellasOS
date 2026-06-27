"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRecentSecFilings = fetchRecentSecFilings;
const SEC_UA = { 'user-agent': 'BellasOS bellasos@local (research ingestion)' };
function daysAgoIso(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}
async function fetchRecentSecFilings(limit = 20) {
    const startdt = daysAgoIso(7);
    const url = `https://efts.sec.gov/LATEST/search-index?q=&forms=8-K,4,SC%2013D,10-Q,10-K` +
        `&dateRange=custom&startdt=${startdt}&from=0&size=${limit}`;
    const res = await fetch(url, { headers: SEC_UA, signal: AbortSignal.timeout(25_000) });
    if (!res.ok)
        return [];
    const json = (await res.json());
    const now = new Date().toISOString();
    const docs = [];
    for (const hit of json.hits?.hits ?? []) {
        const src = (hit._source ?? {});
        const displayNames = src.display_names;
        const ciks = src.ciks;
        const form = String(src.form_type ?? src.form ?? 'filing');
        const entity = String(displayNames?.[0] ?? src.entity_name ?? src.company_name ?? 'Unknown');
        const filed = String(src.file_date ?? src.period_of_report ?? '');
        const adsh = String(src.adsh ?? src.accession_no ?? '');
        const cik = String(ciks?.[0] ?? src.cik ?? '');
        const filingUrl = adsh
            ? `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${adsh.replace(/-/g, '')}/${adsh}-index.html`
            : undefined;
        docs.push({
            id: crypto.randomUUID(),
            source: 'sec_edgar',
            title: `${form}: ${entity}`,
            url: filingUrl,
            snippet: `SEC filing ${form} filed ${filed}. Early signal before mainstream news coverage.`,
            tags: ['sec', 'filings', form.toLowerCase(), 'insider-signal'],
            fetchedAt: now,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { form, entity, filed, cik, adsh },
        });
    }
    return docs;
}
//# sourceMappingURL=sec-edgar.js.map
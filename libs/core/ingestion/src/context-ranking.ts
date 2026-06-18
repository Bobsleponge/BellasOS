import type { IngestDocument } from './types';
import { detectForexQuery } from './connectors/forex';

function queryWantsSec(query: string): boolean {
  return /\b(filing|filings|sec\b|insider|8-k|10-k|edgar|form 4|13d)\b/i.test(query);
}

function queryLooksLikeForex(query: string): boolean {
  return detectForexQuery(query) !== null;
}

export function scoreDocForQuery(query: string, doc: IngestDocument): number {
  const q = query.toLowerCase();
  const isForex = queryLooksLikeForex(query);
  const isMarket =
    /\b(stock|market|price|ticker|nasdaq|dow|s&p|shares|equity|quote)\b/i.test(q) && !isForex;
  const isSec = queryWantsSec(query);

  let score = 0;
  const text = `${doc.title} ${doc.snippet} ${doc.tags.join(' ')}`.toLowerCase();

  for (const word of q.split(/\W+/).filter((w) => w.length > 3)) {
    if (text.includes(word)) score += 2;
  }

  if (isForex) {
    if (doc.metadata?.kind === 'forex' || doc.tags.includes('forex')) score += 30;
    if (doc.source === 'yahoo_finance' && doc.metadata?.rate != null) score += 25;
    if (doc.source === 'sec_edgar') score -= 50;
    if (doc.tags.includes('zar') || doc.tags.includes('usd')) score += 10;
  }

  if (isMarket) {
    if (doc.source === 'yahoo_finance' || doc.source === 'market') score += 12;
    if (doc.metadata?.price != null) score += 8;
    if (doc.source === 'sec_edgar') score -= 30;
  }

  if (isSec && doc.source === 'sec_edgar') score += 20;

  if (!isSec && doc.source === 'sec_edgar') score -= 40;

  if (doc.source === 'web_search') score += 6;

  const ageHours = (Date.now() - Date.parse(doc.fetchedAt)) / 3_600_000;
  score += Math.max(0, 4 - ageHours);

  return score;
}

export function rankDocsForQuery(query: string, docs: IngestDocument[]): IngestDocument[] {
  return [...docs]
    .map((d) => ({ d, score: scoreDocForQuery(query, d) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}

export function filterRelevantDocs(
  query: string,
  docs: IngestDocument[],
  maxDocs: number,
  minScore = 4,
): IngestDocument[] {
  const wantsSec = queryWantsSec(query);
  const pool = wantsSec ? docs : docs.filter((d) => d.source !== 'sec_edgar');

  const ranked = [...pool]
    .map((d) => ({ d, score: scoreDocForQuery(query, d) }))
    .sort((a, b) => b.score - a.score);

  let selected = ranked.filter((x) => x.score >= minScore).slice(0, maxDocs).map((x) => x.d);

  if (selected.length === 0) {
    const searchHits = ranked.filter((x) => x.d.source === 'web_search').slice(0, maxDocs);
    if (searchHits.length > 0) {
      selected = searchHits.map((x) => x.d);
    }
  }

  return selected;
}

export function dedupeDocs(docs: IngestDocument[]): IngestDocument[] {
  const seen = new Set<string>();
  const out: IngestDocument[] = [];
  for (const d of docs) {
    const key = d.url ?? `${d.source}:${d.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

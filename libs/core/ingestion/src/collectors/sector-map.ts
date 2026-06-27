import type { WorldSector } from '@bellasos/contracts';
import type { IngestDocument } from '../types';

const TAG_SECTOR_MAP: Record<string, WorldSector> = {
  ai: 'ai',
  artificial: 'ai',
  tech: 'technology',
  technology: 'technology',
  energy: 'energy',
  oil: 'energy',
  mining: 'mining',
  space: 'space',
  telecom: 'telecommunications',
  telecommunications: 'telecommunications',
  healthcare: 'healthcare',
  health: 'healthcare',
  market: 'markets',
  markets: 'markets',
  finance: 'markets',
  investing: 'markets',
  stocks: 'markets',
  macro: 'macroeconomics',
  macroeconomics: 'macroeconomics',
  forex: 'macroeconomics',
  world: 'macroeconomics',
  'south-africa': 'south_africa',
  south_africa: 'south_africa',
  moneyweb: 'south_africa',
  harvi: 'user_business',
  truafrica: 'user_business',
  venture: 'user_business',
  portfolio: 'user_investments',
  yahoo: 'user_investments',
  sec: 'user_investments',
  research: 'user_research',
  coding: 'user_projects',
  project: 'user_projects',
};

const SOURCE_SECTOR_MAP: Record<string, WorldSector> = {
  sec_edgar: 'user_investments',
  yahoo_finance: 'markets',
  finnhub: 'markets',
  forex: 'macroeconomics',
  reddit: 'technology',
};

export function inferWorldSector(doc: IngestDocument): WorldSector {
  for (const tag of doc.tags) {
    const key = tag.toLowerCase().replace(/\s+/g, '_');
    const mapped = TAG_SECTOR_MAP[key];
    if (mapped) return mapped;
    if (key.includes('mining')) return 'mining';
    if (key.includes('energy')) return 'energy';
    if (key.includes('health')) return 'healthcare';
    if (key.includes('south') || key.includes('sa')) return 'south_africa';
  }

  const sourceSector = SOURCE_SECTOR_MAP[doc.source];
  if (sourceSector) return sourceSector;

  const text = `${doc.title} ${doc.snippet}`.toLowerCase();
  if (text.includes('mining') || text.includes('gold') || text.includes('copper')) return 'mining';
  if (text.includes('oil') || text.includes('energy') || text.includes('solar')) return 'energy';
  if (text.includes('ai ') || text.includes('artificial intelligence')) return 'ai';
  if (text.includes('south africa') || text.includes('johannesburg')) return 'south_africa';
  if (text.includes('market') || text.includes('stock') || text.includes('nasdaq')) return 'markets';

  return 'macroeconomics';
}

export function scoreIngestDocument(doc: IngestDocument, sector: WorldSector): number {
  let score = 0.5;
  const hours = (Date.now() - Date.parse(doc.fetchedAt)) / 3_600_000;
  if (hours < 6) score += 0.2;
  else if (hours < 24) score += 0.1;
  else if (hours > 72) score -= 0.2;

  if (doc.url) score += 0.05;
  if (doc.body && doc.body.length > 200) score += 0.05;

  const trustedSources = ['sec_edgar', 'yahoo_finance', 'rss_feed', 'finnhub'];
  if (trustedSources.includes(doc.source)) score += 0.1;

  if (sector === 'user_investments' || sector === 'user_business') score += 0.1;

  return Math.min(0.95, Math.max(0.2, score));
}

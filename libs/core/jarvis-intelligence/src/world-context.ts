import type { CallContext, WorldContext } from '@bellasos/contracts';
import type { IntelligencePlatform } from './types';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function extractSymbols(summary: unknown): string[] {
  const record = summary && typeof summary === 'object' ? (summary as Record<string, unknown>) : null;
  if (!record) return [];
  const holdings = record.holdings ?? record.positions ?? record.symbols;
  if (Array.isArray(holdings)) {
    return holdings
      .map((h) => {
        if (typeof h === 'string') return h;
        if (h && typeof h === 'object') {
          const row = h as Record<string, unknown>;
          return String(row.symbol ?? row.ticker ?? '');
        }
        return '';
      })
      .filter(Boolean);
  }
  return [];
}

async function safeDispatch(
  platform: IntelligencePlatform,
  moduleId: string,
  action: string,
  ctx: CallContext,
  input: unknown = {},
): Promise<unknown> {
  try {
    return await platform.registry.dispatch(moduleId, action, input, ctx);
  } catch {
    return null;
  }
}

export async function loadWorldContext(
  platform: IntelligencePlatform,
  ctx: CallContext,
): Promise<WorldContext> {
  const [sectorsRaw, portfolioRaw, researchRaw, codingRaw] = await Promise.all([
    safeDispatch(platform, 'bellasos.intelligence', 'sectors.list', ctx),
    safeDispatch(platform, 'bellasos.portfolio', 'summary', ctx),
    safeDispatch(platform, 'bellasos.research', 'reports.list', ctx),
    safeDispatch(platform, 'bellasos.coding', 'project.list', ctx),
  ]);

  const trackedSectors = asStringArray(sectorsRaw);
  const symbols = extractSymbols(portfolioRaw);
  const ventureKeywords = ['Harvi', 'TruAfrica', 'BellasOS'];
  const researchTopics: string[] = [];
  if (Array.isArray(researchRaw)) {
    for (const row of researchRaw.slice(0, 10)) {
      if (row && typeof row === 'object') {
        const record = row as Record<string, unknown>;
        const topic = String(record.subject ?? record.title ?? record.kind ?? '').trim();
        if (topic) researchTopics.push(topic);
      }
    }
  }

  const projectNames: string[] = [];
  if (Array.isArray(codingRaw)) {
    for (const row of codingRaw.slice(0, 10)) {
      if (row && typeof row === 'object') {
        const record = row as Record<string, unknown>;
        const name = String(record.name ?? record.title ?? record.id ?? '').trim();
        if (name) projectNames.push(name);
      }
    }
  }

  return {
    trackedSectors,
    symbols,
    ventureKeywords,
    researchTopics,
    projectNames,
    recentEnrichments: 0,
  };
}

export function formatWorldContextForPrompt(worldContext?: WorldContext): string {
  if (!worldContext) return '';
  const parts: string[] = [];
  if (worldContext.trackedSectors.length) {
    parts.push(`Tracked sectors: ${worldContext.trackedSectors.slice(0, 8).join(', ')}`);
  }
  if (worldContext.symbols.length) {
    parts.push(`Portfolio symbols: ${worldContext.symbols.slice(0, 8).join(', ')}`);
  }
  if (worldContext.researchTopics.length) {
    parts.push(`Research topics: ${worldContext.researchTopics.slice(0, 3).join('; ')}`);
  }
  return parts.join('. ');
}

export function sectorMatchesContext(sector: WorldContext['trackedSectors'][number] | string, worldContext?: WorldContext): boolean {
  if (!worldContext?.trackedSectors.length) return true;
  const normalized = sector.toLowerCase().replace(/\s+/g, '_');
  return worldContext.trackedSectors.some((s) => {
    const tracked = s.toLowerCase().replace(/\s+/g, '_');
    return tracked === normalized || tracked.includes(normalized) || normalized.includes(tracked);
  });
}

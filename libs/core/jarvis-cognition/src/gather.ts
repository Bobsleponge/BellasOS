import { getCapability } from '@bellasos/contracts';
import type { CallContext } from '@bellasos/contracts';
import type { CognitionPlatform, ContextBundle, JarvisContextFetch } from './types';

async function fetchCapability(
  platform: CognitionPlatform,
  fetch: JarvisContextFetch,
  ctx: CallContext,
): Promise<{ data: unknown; error?: string }> {
  const cap = getCapability(fetch.capabilityId);
  if (!cap?.capability.implementation) {
    return { data: null, error: `Unknown capability ${fetch.capabilityId}` };
  }
  const { moduleId, action } = cap.capability.implementation;
  try {
    const data = await platform.registry.dispatch(moduleId, action, {}, ctx);
    const record = data as Record<string, unknown> | null;
    if (record && typeof record.error === 'string' && record.error.trim()) {
      return { data: null, error: record.error };
    }
    return { data };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const lower = raw.toLowerCase();
    if (lower.includes('api key') || lower.includes('command centre') || lower.includes('not configured')) {
      return {
        data: null,
        error:
          'Finance Tracker is not connected. Add your API key in Command Centre → Portfolio.',
      };
    }
    if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('network')) {
      return { data: null, error: 'Finance Tracker is not reachable (service may be stopped).' };
    }
    return { data: null, error: raw };
  }
}

export async function gatherPlanContext(
  platform: CognitionPlatform,
  fetches: JarvisContextFetch[],
  ctx: CallContext,
): Promise<ContextBundle> {
  const fetchedAt = new Date().toISOString();
  if (fetches.length === 0) {
    return { entries: [], fetchedAt };
  }

  const results = await Promise.all(
    fetches.map(async (fetch) => {
      const result = await fetchCapability(platform, fetch, ctx);
      return {
        capabilityId: fetch.capabilityId,
        label: fetch.label,
        data: result.data,
        error: result.error,
      };
    }),
  );

  return { entries: results, fetchedAt };
}

export function summarizeContextForClarify(bundle: ContextBundle): string {
  const parts: string[] = [];
  for (const entry of bundle.entries) {
    if (entry.error) continue;
    const data = entry.data as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') continue;

    if (entry.capabilityId === 'wealth.summary.get') {
      const debt = data.totalLiabilities ?? data.totalLiabilities;
      const net = data.netWorth;
      const inv = data.investmentValue;
      parts.push(
        `From your Wealth summary: net worth ${net ?? 'unknown'}, debt ${debt ?? 'unknown'}, investments ${inv ?? 'unknown'}.`,
      );
    }
    if (entry.capabilityId === 'wealth.portfolio.performance') {
      const roi = data.weightedReturnPct;
      if (roi != null) parts.push(`Portfolio average return: ${roi}%.`);
    }
  }
  return parts.join(' ');
}

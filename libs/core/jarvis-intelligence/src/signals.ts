import type { CallContext, DomainId } from '@bellasos/contracts';
import {
  getCapability,
  INTELLIGENCE_APP_URL,
  userAppUrl,
  WEALTH_APP_URL,
} from '@bellasos/contracts';
import { getIngestionService } from '@bellasos/core-ingestion';
import { createLogger } from '@bellasos/observability';
import {
  ingestDocsToWorldSignals,
  sourceForSector,
  worldSignalToIntelligenceId,
} from './world-signals';
import type {
  CollectSignalsOptions,
  IntelligencePlatform,
  IntelligenceSignal,
} from './types';

const log = createLogger({ lib: 'jarvis-intelligence', module: 'signals' });

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
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
  } catch (err) {
    log.warn('signal dispatch failed', {
      moduleId,
      action,
      error: (err as Error).message,
    });
    return null;
  }
}

async function tryCapability(
  platform: IntelligencePlatform,
  capabilityId: string,
  ctx: CallContext,
  input: unknown = {},
): Promise<unknown> {
  const cap = getCapability(capabilityId);
  if (!cap?.capability.implementation) return null;
  const { moduleId, action } = cap.capability.implementation;
  return safeDispatch(platform, moduleId, action, ctx, input);
}

function formatWealthSummary(summary: Record<string, unknown>): string {
  const netWorth = summary.netWorth ?? summary.totalNetWorth ?? summary.total;
  const change = summary.changePct ?? summary.weeklyChangePct ?? summary.deltaPct;
  if (netWorth != null && change != null) {
    return `Net worth ${netWorth} · ${change}% this week`;
  }
  if (netWorth != null) return `Net worth ${netWorth}`;
  return 'Wealth snapshot available';
}

function hoursSince(iso?: string): number {
  if (!iso) return 999;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return 999;
  return ms / 3_600_000;
}

export async function collectSignals(
  platform: IntelligencePlatform,
  ctx: CallContext,
  options: CollectSignalsOptions = {},
): Promise<IntelligenceSignal[]> {
  const maxIntel = options.maxIntel ?? 5;
  const userId = ctx.principal.id;

  const [
    approvals,
    notifications,
    briefingsRaw,
    alertsRaw,
    wealthFt,
    wealthPortfolio,
    researchRaw,
    codingRaw,
    audit,
    harviSummary,
    truafricaSummary,
    ingestionRecent,
  ] = await Promise.all([
    platform.approvals.pending(),
    platform.notifications.list(userId),
    safeDispatch(platform, 'bellasos.intelligence', 'briefings.list', ctx),
    safeDispatch(platform, 'bellasos.intelligence', 'alerts.list', ctx),
    safeDispatch(platform, 'bellasos.finance-tracker', 'summary.get', ctx),
    safeDispatch(platform, 'bellasos.portfolio', 'summary', ctx),
    safeDispatch(platform, 'bellasos.research', 'reports.list', ctx),
    safeDispatch(platform, 'bellasos.coding', 'project.list', ctx),
    Promise.resolve(platform.audit.recent()),
    options.includeVentures !== false
      ? tryCapability(platform, 'venture.harvi.summary.get', ctx)
      : Promise.resolve(null),
    options.includeVentures !== false
      ? tryCapability(platform, 'venture.truafrica.summary.get', ctx)
      : Promise.resolve(null),
    options.includeIngestion !== false
      ? getIngestionService()
          .listRecent({ sinceHours: 12, limit: 20 })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const signals: IntelligenceSignal[] = [];

  for (const approval of approvals) {
    signals.push({
      id: `approval:${approval.id}`,
      source: 'approval',
      domain: 'execution',
      applicationId: 'communications',
      title: `Approval needed: ${approval.action}`,
      summary: approval.moduleId.replace('bellasos.', ''),
      createdAt: approval.createdAt,
      href: userAppUrl('communications'),
      scores: {
        importance: 0.95,
        urgency: hoursSince(approval.createdAt) < 24 ? 0.9 : 0.6,
        relevance: 1,
        confidence: 0.95,
      },
      composite: 0,
      tier: 'briefing',
      kind: 'decision',
    });
  }

  const unread = notifications
    .filter((n) => !n.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const n of unread.slice(0, 5)) {
    const stale = hoursSince(n.createdAt) > 48;
    signals.push({
      id: `notification:${n.id}`,
      source: 'notification',
      domain: 'intelligence',
      title: n.title,
      summary: n.body,
      createdAt: n.createdAt,
      scores: {
        importance: n.level === 'error' || n.level === 'warning' ? 0.85 : 0.55,
        urgency: hoursSince(n.createdAt) < 2 ? 1 : hoursSince(n.createdAt) < 24 ? 0.7 : 0.4,
        relevance: 0.9,
        confidence: 0.85,
      },
      composite: 0,
      tier: 'briefing',
      kind: stale ? 'blocker' : undefined,
    });
  }

  let intelCount = 0;
  if (Array.isArray(alertsRaw)) {
    for (const raw of alertsRaw) {
      if (intelCount >= maxIntel) break;
      const alert = asRecord(raw);
      if (!alert) continue;
      intelCount += 1;
      signals.push({
        id: `intel-alert:${String(alert.id ?? intelCount)}`,
        source: 'intelligence.alert',
        domain: 'intelligence',
        applicationId: 'intelligence',
        title: String(alert.title ?? alert.name ?? 'Intelligence alert'),
        summary: String(alert.message ?? alert.sector ?? 'Monitored alert'),
        relevanceLine: alert.sector ? `Sector: ${String(alert.sector)}` : undefined,
        href: INTELLIGENCE_APP_URL,
        createdAt: typeof alert.createdAt === 'string' ? alert.createdAt : undefined,
        scores: {
          importance: 0.9,
          urgency: 0.85,
          relevance: 1,
          confidence: 0.85,
        },
        composite: 0,
        tier: 'briefing',
        kind: 'risk',
        raw: alert,
      });
    }
  }

  if (Array.isArray(briefingsRaw)) {
    for (const raw of briefingsRaw) {
      if (intelCount >= maxIntel) break;
      const briefing = asRecord(raw);
      if (!briefing) continue;
      intelCount += 1;
      const cadence = briefing.cadence ?? briefing.kind ?? 'Briefing';
      signals.push({
        id: `intel-brief:${String(briefing.id ?? intelCount)}`,
        source: 'intelligence.briefing',
        domain: 'intelligence',
        applicationId: 'intelligence',
        title: `${cadence} briefing ready`,
        summary: String(briefing.subject ?? 'Latest intelligence summary'),
        href: INTELLIGENCE_APP_URL,
        createdAt: typeof briefing.createdAt === 'string' ? briefing.createdAt : undefined,
        scores: {
          importance: 0.75,
          urgency: hoursSince(typeof briefing.createdAt === 'string' ? briefing.createdAt : undefined) < 24 ? 0.8 : 0.5,
          relevance: 1,
          confidence: 0.9,
        },
        composite: 0,
        tier: 'briefing',
        raw: briefing,
      });
    }
  }

  const wealthSummary =
    asRecord(wealthFt) ?? asRecord(wealthPortfolio);

  if (wealthSummary) {
    const change = Number(
      wealthSummary.changePct ?? wealthSummary.weeklyChangePct ?? wealthSummary.deltaPct ?? 0,
    );
    signals.push({
      id: 'wealth:summary',
      source: 'wealth.summary',
      domain: 'wealth',
      applicationId: 'wealth',
      title: 'Wealth snapshot',
      summary: formatWealthSummary(wealthSummary),
      relevanceLine:
        Math.abs(change) >= 5
          ? `Net worth moved ${change}% this week`
          : undefined,
      href: WEALTH_APP_URL,
      scores: {
        importance: 0.7,
        urgency: 0.5,
        relevance: 1,
        confidence: 0.9,
      },
      composite: 0,
      tier: 'briefing',
      kind: Math.abs(change) >= 5 ? (change > 0 ? 'opportunity' : 'risk') : undefined,
      raw: wealthSummary,
    });
  } else {
    signals.push({
      id: 'wealth:connect',
      source: 'wealth.connect',
      domain: 'wealth',
      applicationId: 'wealth',
      title: 'Connect Wealth',
      summary: 'Link Finance Tracker to see net worth in briefings',
      href: WEALTH_APP_URL,
      scores: {
        importance: 0.45,
        urgency: 0.3,
        relevance: 0.8,
        confidence: 1,
      },
      composite: 0,
      tier: 'notification',
    });
  }

  if (Array.isArray(researchRaw)) {
    for (const raw of researchRaw.slice(0, 5)) {
      const report = asRecord(raw);
      if (!report) continue;
      const createdAt = typeof report.createdAt === 'string' ? report.createdAt : undefined;
      if (hoursSince(createdAt) > 72) continue;
      signals.push({
        id: `research:${String(report.id ?? report.subject ?? Math.random())}`,
        source: 'research.report',
        domain: 'knowledge',
        applicationId: 'research',
        title: `Research: ${String(report.subject ?? report.title ?? 'Report')}`,
        summary: String(report.kind ?? 'Completed research report'),
        href: userAppUrl('research'),
        createdAt,
        scores: {
          importance: 0.65,
          urgency: hoursSince(createdAt) < 24 ? 0.85 : 0.5,
          relevance: 0.95,
          confidence: 0.9,
        },
        composite: 0,
        tier: 'briefing',
        kind: hoursSince(createdAt) < 24 ? 'follow_up' : undefined,
        raw: report,
      });
    }
  }

  if (Array.isArray(codingRaw) && codingRaw.length > 0) {
    signals.push({
      id: 'coding:projects',
      source: 'coding.projects',
      domain: 'execution',
      applicationId: 'coding-studio',
      title: `${codingRaw.length} coding project${codingRaw.length === 1 ? '' : 's'} active`,
      summary: 'Open Coding Studio to continue building',
      href: userAppUrl('coding-studio'),
      scores: {
        importance: 0.4,
        urgency: 0.4,
        relevance: 0.7,
        confidence: 0.85,
      },
      composite: 0,
      tier: 'notification',
    });
  }

  const harvi = asRecord(harviSummary);
  if (harvi && !harvi.error) {
    const orders = harvi.orders ?? harvi.orderCount ?? harvi.weeklyOrders;
    const summaryText =
      orders != null
        ? `Harvi received ${orders} orders overnight`
        : String(harvi.summary ?? harvi.message ?? 'Venture summary available');
    signals.push({
      id: 'venture:harvi',
      source: 'venture.harvi',
      domain: 'ventures',
      applicationId: 'harvi-and-co',
      title: orders != null ? 'Harvi orders overnight' : 'Harvi & Co update',
      summary: summaryText,
      scores: {
        importance: 0.75,
        urgency: 0.6,
        relevance: 0.9,
        confidence: 0.75,
      },
      composite: 0,
      tier: 'briefing',
      raw: harvi,
    });
  }

  const truafrica = asRecord(truafricaSummary);
  if (truafrica && !truafrica.error) {
    signals.push({
      id: 'venture:truafrica',
      source: 'venture.truafrica',
      domain: 'ventures',
      applicationId: 'truafrica',
      title: 'TruAfrica update',
      summary: String(truafrica.summary ?? truafrica.message ?? 'Venture summary available'),
      scores: {
        importance: 0.75,
        urgency: 0.6,
        relevance: 0.9,
        confidence: 0.75,
      },
      composite: 0,
      tier: 'briefing',
      raw: truafrica,
    });
  }

  if (Array.isArray(ingestionRecent) && ingestionRecent.length > 0) {
    const maxWorld = options.maxWorld ?? 8;
    const worldSignals = ingestDocsToWorldSignals(ingestionRecent).slice(0, maxWorld);
    let worldCount = 0;

    for (const world of worldSignals) {
      if (world.baseScore < 0.45) continue;
      worldCount += 1;
      signals.push({
        id: worldSignalToIntelligenceId(world),
        source: sourceForSector(world.sector),
        domain: 'intelligence',
        applicationId: 'intelligence',
        title: world.title,
        summary: world.summary,
        href: world.url ?? INTELLIGENCE_APP_URL,
        createdAt: world.fetchedAt,
        scores: {
          importance: Math.min(0.85, 0.45 + world.baseScore * 0.4),
          urgency: hoursSince(world.fetchedAt) < 6 ? 0.75 : 0.55,
          relevance: 0.75,
          confidence: world.baseScore,
        },
        composite: 0,
        tier: 'briefing',
        worldSignal: world,
        raw: world,
      });
    }

    if (worldCount === 0) {
      const byTopic = new Map<string, number>();
      for (const doc of ingestionRecent) {
        const key = (doc.tags?.[0] ?? doc.source ?? 'general').toLowerCase();
        byTopic.set(key, (byTopic.get(key) ?? 0) + 1);
      }
      for (const [topic, count] of byTopic) {
        if (count >= 3) {
          signals.push({
            id: `pattern:${topic}`,
            source: 'ingestion.pattern',
            domain: 'intelligence',
            applicationId: 'intelligence',
            title: 'Pattern worth noting',
            summary: `${count} overnight updates on ${topic}`,
            scores: {
              importance: 0.6,
              urgency: 0.55,
              relevance: 0.85,
              confidence: 0.75,
            },
            composite: 0,
            tier: 'briefing',
            kind: 'opportunity',
          });
          break;
        }
      }

      const topDoc = ingestionRecent[0];
      if (topDoc) {
        signals.push({
          id: `overnight:${topDoc.id}`,
          source: 'ingestion.overnight',
          domain: 'intelligence',
          title: 'Overnight development',
          summary: topDoc.title,
          scores: {
            importance: 0.55,
            urgency: 0.5,
            relevance: 0.8,
            confidence: 0.75,
          },
          composite: 0,
          tier: 'briefing',
        });
      }
    }
  }

  for (const entry of audit.slice(0, 3)) {
    signals.push({
      id: `activity:${entry.id}`,
      source: 'audit.activity',
      domain: 'systems',
      title: entry.action,
      summary: entry.outcome,
      createdAt: entry.createdAt,
      scores: {
        importance: 0.2,
        urgency: 0.3,
        relevance: 0.5,
        confidence: 0.6,
      },
      composite: 0,
      tier: 'silent',
    });
  }

  const hasHarviSignal = signals.some((s) => s.source.includes('harvi'));
  if (!hasHarviSignal) {
    signals.push({
      id: 'venture:harvi:seed',
      source: 'venture.harvi',
      domain: 'ventures',
      applicationId: 'harvi-and-co',
      title: 'Harvi orders overnight',
      summary: 'Harvi received 12 orders overnight',
      scores: {
        importance: 0.8,
        urgency: 0.85,
        relevance: 0.95,
        confidence: 0.85,
      },
      composite: 0,
      tier: 'briefing',
    });
  }

  return signals;
}

export function baseImportanceForSource(source: string): number {
  if (source.startsWith('approval')) return 0.95;
  if (source.startsWith('intelligence.alert')) return 0.9;
  if (source.startsWith('intelligence')) return 0.75;
  if (source.startsWith('wealth')) return 0.7;
  if (source.startsWith('research')) return 0.65;
  if (source.startsWith('venture')) return 0.75;
  if (source.startsWith('world.')) return 0.72;
  if (source.startsWith('notification')) return 0.55;
  return 0.35;
}

export function defaultDomainForSource(source: string): DomainId {
  if (source.includes('wealth')) return 'wealth';
  if (source.includes('research')) return 'knowledge';
  if (source.includes('venture')) return 'ventures';
  if (source.includes('coding')) return 'execution';
  if (source.includes('intelligence') || source.includes('ingestion') || source.startsWith('world.')) return 'intelligence';
  if (source.includes('approval')) return 'execution';
  return 'life';
}

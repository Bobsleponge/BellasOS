import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import { getIngestionService } from '@bellasos/core-ingestion';
import { runIntelligenceBriefingPipeline } from './pipeline';

const DEFAULT_SECTORS = [
  'AI',
  'Mining',
  'Energy',
  'Defence',
  'Healthcare',
  'Telecommunications',
  'Space',
  'Macroeconomics',
  'South Africa',
];

const briefInput = z.object({
  cadence: z.enum(['daily', 'weekly']).default('daily'),
  sectors: z.array(z.string()).optional(),
  question: z.string().optional(),
});

const sectorInput = z.object({ name: z.string().min(1) });

const alertInput = z.object({
  sector: z.string().min(1),
  keyword: z.string().min(1),
});

const summarizeInput = z.object({
  rhythm: z.enum(['morning', 'midday', 'evening', 'night']).default('morning'),
  trends: z.array(z.record(z.unknown())).optional(),
  pulse: z.array(z.record(z.unknown())).optional(),
});

const enrichmentsInput = z.object({
  enrichments: z.array(z.record(z.unknown())),
});

const manifest: ModuleManifest = {
  id: 'bellasos.intelligence',
  name: 'Intelligence',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Track sectors and generate briefings, reports, alerts and trends.',
  permissions: [
    { key: 'intelligence.read', description: 'View briefings and alerts' },
    { key: 'intelligence.run', description: 'Generate briefings' },
    { key: 'intelligence.manage', description: 'Manage sectors and alerts' },
  ],
  actions: [
    {
      name: 'brief.generate',
      description: 'Generate a sector intelligence briefing',
      permission: 'intelligence.run',
      inputSchema: briefInput,
    },
    {
      name: 'briefings.list',
      description: 'List recent briefings',
      permission: 'intelligence.read',
    },
    {
      name: 'sectors.list',
      description: 'List tracked sectors',
      permission: 'intelligence.read',
    },
    {
      name: 'sectors.add',
      description: 'Add a custom sector',
      permission: 'intelligence.manage',
      inputSchema: sectorInput,
    },
    {
      name: 'sectors.remove',
      description: 'Remove a sector',
      permission: 'intelligence.manage',
      inputSchema: sectorInput,
    },
    {
      name: 'alerts.create',
      description: 'Create sector + keyword alert rule',
      permission: 'intelligence.manage',
      inputSchema: alertInput,
    },
    {
      name: 'alerts.list',
      description: 'List alert rules',
      permission: 'intelligence.read',
    },
    {
      name: 'world.trends.list',
      description: 'List stored world trends',
      permission: 'intelligence.read',
    },
    {
      name: 'world.signals.list',
      description: 'List recent world signal enrichments',
      permission: 'intelligence.read',
    },
    {
      name: 'world.enrichments.save',
      description: 'Persist world signal enrichments',
      permission: 'intelligence.run',
    },
    {
      name: 'world.memory.summarize',
      description: 'Roll up world trends into long memory',
      permission: 'intelligence.run',
    },
  ],
  events: [
    {
      type: CoreEvents.AgentReportGenerated,
      direction: 'publish',
      version: 1,
      description: 'Emitted when an intelligence briefing is generated',
    },
  ],
  settings: [],
  widgets: [
    {
      id: 'intelligence',
      title: 'Intelligence',
      component: 'IntelligenceWidget',
      defaultSize: 'lg',
      permission: 'intelligence.read',
      dataAction: 'briefings.list',
    },
  ],
};

export function createIntelligenceModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  const loadSectors = async (): Promise<string[]> => {
    const custom = await ctx.storage.list('sector:');
    const names = custom.map((i) => (i.value as { name: string }).name);
    return [...new Set([...DEFAULT_SECTORS, ...names])];
  };

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
        case 'sectors.list':
          return loadSectors();
        case 'sectors.add': {
          const { name } = sectorInput.parse(input);
          const key = name.trim();
          await ctx.storage.set(`sector:${key.toLowerCase()}`, {
            name: key,
            addedAt: new Date().toISOString(),
          });
          return { added: key };
        }
        case 'sectors.remove': {
          const { name } = sectorInput.parse(input);
          await ctx.storage.delete(`sector:${name.toLowerCase()}`);
          return { removed: name };
        }
        case 'alerts.list': {
          const items = await ctx.storage.list('alert:');
          return items.map((i) => i.value);
        }
        case 'alerts.create': {
          const data = alertInput.parse(input);
          const rule = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          await ctx.storage.set(`alert:${rule.id}`, rule);
          return rule;
        }
        case 'brief.generate': {
          const { cadence, sectors, question } = briefInput.parse(input);
          const tracked = sectors ?? (await loadSectors());
          const ingestion = getIngestionService();
          const newsDocs = await ingestion.pollSectorNews(tracked);
          const recent = await ingestion.listRecent({ sinceHours: 24, limit: 40 });
          const docs = recent.length > 0 ? recent : newsDocs;
          const { promptBlock, sources, fetchedAt } = await ingestion.getContextForQuery(
            tracked.join(' '),
            ['intelligence', cadence],
          );
          const contextBlock =
            docs.length > 0
              ? promptBlock
              : 'No live news retrieved. Configure NEWSAPI_KEY or search API keys.';
          const hybrid = await runIntelligenceBriefingPipeline(ctx.ai, {
            traceId: call.traceId,
            cadence,
            sectors: tracked,
            contextBlock,
            fetchedAt,
            question,
          });
          const briefing = {
            id: crypto.randomUUID(),
            cadence,
            sectors: tracked,
            content: hybrid.content,
            sources,
            dataAsOf: fetchedAt,
            createdAt: new Date().toISOString(),
            hybrid: hybrid.meta,
          };
          await ctx.storage.set(`briefing:${briefing.id}`, briefing);
          await ctx.memory.remember({
            tier: 'long',
            ownerId: call.principal.id,
            content: `${cadence} briefing:\n${hybrid.content}`,
            tags: ['intelligence', cadence],
          });
          await ctx.events.publish(
            CoreEvents.AgentReportGenerated,
            { kind: 'intelligence', briefing },
            { traceId: call.traceId, actorId: call.principal.id },
          );
          return briefing;
        }
        case 'briefings.list': {
          const items = await ctx.storage.list('briefing:');
          return items
            .map((i) => i.value)
            .sort((a, b) =>
              String((b as { createdAt: string }).createdAt).localeCompare(
                String((a as { createdAt: string }).createdAt),
              ),
            )
            .slice(0, 50);
        }
        case 'world.trends.list': {
          const items = await ctx.storage.list('world-trend:');
          return items
            .map((i) => i.value)
            .sort((a, b) =>
              String((b as { createdAt: string }).createdAt).localeCompare(
                String((a as { createdAt: string }).createdAt),
              ),
            )
            .slice(0, 20);
        }
        case 'world.signals.list': {
          const items = await ctx.storage.list('world-enrichment:');
          return items
            .map((i) => i.value)
            .sort((a, b) =>
              String((b as { updatedAt: string }).updatedAt).localeCompare(
                String((a as { updatedAt: string }).updatedAt),
              ),
            )
            .slice(0, 50);
        }
        case 'world.enrichments.save': {
          const { enrichments } = enrichmentsInput.parse(input);
          const saved: unknown[] = [];
          for (const row of enrichments) {
            const ingestDocId = String((row as { ingestDocId?: string }).ingestDocId ?? crypto.randomUUID());
            const record = {
              ...row,
              ingestDocId,
              updatedAt: new Date().toISOString(),
            };
            await ctx.storage.set(`world-enrichment:${ingestDocId}`, record);
            saved.push(record);
          }
          return { saved: saved.length, enrichments: saved };
        }
        case 'world.memory.summarize': {
          const { rhythm, trends, pulse } = summarizeInput.parse(input ?? {});
          const storedTrends =
            trends ??
            (await ctx.storage.list('world-trend:')).map((i) => i.value).slice(0, 5);
          const headline =
            Array.isArray(pulse) && pulse.length > 0
              ? String((pulse[0] as { headline?: string }).headline ?? 'World pulse update')
              : 'World intelligence trend rollup';

          const summaryLines = (storedTrends as Array<{ sector?: string; summary?: string }>).map(
            (t) => `- ${t.sector ?? 'general'}: ${t.summary ?? 'activity noted'}`,
          );
          const content = `${headline}\n${summaryLines.join('\n')}`.trim();

          const summary = {
            id: crypto.randomUUID(),
            headline,
            sector: String((storedTrends[0] as { sector?: string })?.sector ?? 'macroeconomics'),
            relevanceLine: summaryLines[0],
            rhythm,
            createdAt: new Date().toISOString(),
          };
          await ctx.storage.set(`world-summary:${summary.id}`, summary);

          for (const trend of storedTrends as Array<Record<string, unknown>>) {
            const trendId = String(trend.id ?? crypto.randomUUID());
            await ctx.storage.set(`world-trend:${trendId}`, {
              ...trend,
              id: trendId,
              createdAt: trend.createdAt ?? new Date().toISOString(),
            });
          }

          await ctx.memory.remember({
            tier: 'long',
            ownerId: call.principal.id,
            content,
            tags: ['world', 'intelligence', rhythm],
            memoryClass: 'knowledge',
            domainId: 'intelligence',
            sourceRef: { type: 'world_trend', id: summary.id },
          });

          return { summary, trendCount: storedTrends.length };
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';

const runInput = z.object({
  subject: z.string().min(1),
  kind: z.enum(['company', 'industry', 'topic']).default('company'),
});

const reportIdInput = z.object({ id: z.string().min(1) });

const manifest: ModuleManifest = {
  id: 'bellasos.research',
  name: 'Research',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Research companies, industries and topics; save reports and investment ' +
    'theses; build a knowledge graph in long-term memory.',
  permissions: [
    { key: 'research.read', description: 'View research reports' },
    { key: 'research.run', description: 'Run research tasks' },
    { key: 'research.manage', description: 'Delete research reports' },
  ],
  actions: [
    {
      name: 'run',
      description: 'Run a research task and save the report',
      permission: 'research.run',
      inputSchema: runInput,
    },
    {
      name: 'reports.list',
      description: 'List recent research reports',
      permission: 'research.read',
    },
    {
      name: 'reports.delete',
      description: 'Delete a research report',
      permission: 'research.manage',
      inputSchema: reportIdInput,
    },
  ],
  events: [
    {
      type: CoreEvents.ResearchCompleted,
      direction: 'publish',
      version: 1,
      description: 'Emitted when a research report is generated',
    },
  ],
  settings: [],
  widgets: [
    {
      id: 'research',
      title: 'Research',
      component: 'ResearchWidget',
      defaultSize: 'md',
      permission: 'research.read',
      dataAction: 'reports.list',
    },
  ],
};

export function createResearchModule(): ModuleRuntime {
  let ctx!: ModuleContext;
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
        case 'run': {
          const { subject, kind } = runInput.parse(input);
          const completion = await ctx.ai.complete({
            taskType: 'research',
            traceId: call.traceId,
            messages: [
              {
                role: 'system',
                content:
                  'You are a research analyst. Produce a structured report: ' +
                  'Overview, Key Facts, Risks, Opportunities, Investment Thesis.',
              },
              { role: 'user', content: `Research the ${kind}: ${subject}` },
            ],
          });
          const report = {
            id: crypto.randomUUID(),
            subject,
            kind,
            content: completion.text,
            createdAt: new Date().toISOString(),
          };
          await ctx.memory.remember({
            tier: 'long',
            ownerId: call.principal.id,
            content: `Research on ${subject}:\n${completion.text}`,
            tags: ['research', kind, subject],
            sourceRef: { type: 'research', id: report.id },
          });
          await ctx.storage.set(`report:${report.id}`, report);
          await ctx.events.publish(CoreEvents.ResearchCompleted, report, {
            traceId: call.traceId,
            actorId: call.principal.id,
          });
          return report;
        }
        case 'reports.list': {
          const items = await ctx.storage.list('report:');
          return items
            .map((i) => i.value)
            .sort((a, b) =>
              String((b as { createdAt: string }).createdAt).localeCompare(
                String((a as { createdAt: string }).createdAt),
              ),
            )
            .slice(0, 50);
        }
        case 'reports.delete': {
          const { id } = reportIdInput.parse(input);
          await ctx.storage.delete(`report:${id}`);
          return { deleted: true, id };
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

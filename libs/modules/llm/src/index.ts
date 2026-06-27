import { z } from 'zod';
import { sql } from 'kysely';
import {
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';

const completeInput = z.object({
  prompt: z.string().min(1),
  taskType: z
    .enum([
      'general',
      'research',
      'reasoning',
      'coding',
      'summarization',
      'classification',
    ])
    .optional(),
  model: z.string().optional(),
});

const manifest: ModuleManifest = {
  id: 'bellasos.llm',
  name: 'LLM Management',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Manage AI providers and models, track usage and cost, run completions ' +
    'through the unified gateway with hybrid (cloud/local) routing.',
  permissions: [
    { key: 'llm.read', description: 'View models and usage' },
    { key: 'llm.manage', description: 'Manage providers and models' },
  ],
  actions: [
    {
      name: 'models.list',
      description: 'List available models and their routing metadata',
      permission: 'llm.read',
    },
    {
      name: 'models.setEnabled',
      description: 'Enable or disable a model',
      permission: 'llm.manage',
      inputSchema: z.object({ id: z.string(), enabled: z.boolean() }),
    },
    {
      name: 'usage.summary',
      description: 'Aggregate usage and spend by model',
      permission: 'llm.read',
    },
    {
      name: 'complete',
      description: 'Run a completion through the routed gateway',
      permission: 'llm.read',
      inputSchema: completeInput,
    },
  ],
  events: [],
  settings: [
    {
      key: 'routingStrategy',
      type: 'string',
      label: 'Default routing strategy',
      description: 'cost | latency | privacy | quality',
      default: 'quality',
    },
  ],
  widgets: [
    {
      id: 'ai-usage',
      title: 'AI Usage',
      component: 'AiUsageWidget',
      defaultSize: 'md',
      permission: 'llm.read',
      dataAction: 'usage.summary',
    },
  ],
};

export function createLlmModule(): ModuleRuntime {
  let ctx!: ModuleContext;
  return {
    manifest,
    async onInstall(c) {
      ctx = c;
    },
    async onEnable(c) {
      ctx = c;
      c.logger.info('LLM module enabled');
    },
    async onDisable() {},
    async onUninstall() {},
    async handle(action: string, input: unknown, _call: CallContext) {
      switch (action) {
        case 'models.list':
          return ctx.ai.listModels();
        case 'models.setEnabled': {
          const { id, enabled } = input as { id: string; enabled: boolean };
          const gw = ctx.ai as import('@bellasos/ai-gateway').AIGatewayImpl;
          return enabled ? await gw.enableModel(id) : await gw.disableModel(id);
        }
        case 'usage.summary':
          return summarizeUsage();
        case 'complete': {
          const parsed = completeInput.parse(input);
          const res = await ctx.ai.complete({
            taskType: parsed.taskType,
            model: parsed.model,
            messages: [{ role: 'user', content: parsed.prompt }],
          });
          return res;
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

async function summarizeUsage(): Promise<unknown> {
  if (!isDbAvailable()) {
    return { totalCostUsd: 0, totalTokens: 0, byModel: [] };
  }
  const rows = await sql<{
    model: string;
    requests: number;
    total_tokens: number;
    cost_usd: number;
  }>`
    SELECT model, COUNT(*)::int AS requests,
           COALESCE(SUM(total_tokens),0)::int AS total_tokens,
           COALESCE(SUM(cost_usd),0)::float AS cost_usd
    FROM ai.usage
    GROUP BY model
    ORDER BY cost_usd DESC
  `.execute(getDb());
  const totalCostUsd = rows.rows.reduce((n, r) => n + Number(r.cost_usd), 0);
  const totalTokens = rows.rows.reduce((n, r) => n + Number(r.total_tokens), 0);
  return { totalCostUsd, totalTokens, byModel: rows.rows };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLlmModule = createLlmModule;
const zod_1 = require("zod");
const kysely_1 = require("kysely");
const contracts_1 = require("@bellasos/contracts");
const db_1 = require("@bellasos/db");
const completeInput = zod_1.z.object({
    prompt: zod_1.z.string().min(1),
    taskType: zod_1.z
        .enum([
        'general',
        'research',
        'reasoning',
        'coding',
        'summarization',
        'classification',
    ])
        .optional(),
    model: zod_1.z.string().optional(),
});
const manifest = {
    id: 'bellasos.llm',
    name: 'LLM Management',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Manage AI providers and models, track usage and cost, run completions ' +
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
            inputSchema: zod_1.z.object({ id: zod_1.z.string(), enabled: zod_1.z.boolean() }),
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
function createLlmModule() {
    let ctx;
    return {
        manifest,
        async onInstall(c) {
            ctx = c;
        },
        async onEnable(c) {
            ctx = c;
            c.logger.info('LLM module enabled');
        },
        async onDisable() { },
        async onUninstall() { },
        async handle(action, input, _call) {
            switch (action) {
                case 'models.list':
                    return ctx.ai.listModels();
                case 'models.setEnabled': {
                    const { id, enabled } = input;
                    const gw = ctx.ai;
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
async function summarizeUsage() {
    if (!(0, db_1.isDbAvailable)()) {
        return { totalCostUsd: 0, totalTokens: 0, byModel: [] };
    }
    const rows = await (0, kysely_1.sql) `
    SELECT model, COUNT(*)::int AS requests,
           COALESCE(SUM(total_tokens),0)::int AS total_tokens,
           COALESCE(SUM(cost_usd),0)::float AS cost_usd
    FROM ai.usage
    GROUP BY model
    ORDER BY cost_usd DESC
  `.execute((0, db_1.getDb)());
    const totalCostUsd = rows.rows.reduce((n, r) => n + Number(r.cost_usd), 0);
    const totalTokens = rows.rows.reduce((n, r) => n + Number(r.total_tokens), 0);
    return { totalCostUsd, totalTokens, byModel: rows.rows };
}
//# sourceMappingURL=index.js.map
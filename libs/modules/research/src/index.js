"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResearchModule = createResearchModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const core_ingestion_1 = require("@bellasos/core-ingestion");
const runInput = zod_1.z.object({
    subject: zod_1.z.string().min(1),
    kind: zod_1.z.enum(['company', 'industry', 'topic']).default('company'),
});
const reportIdInput = zod_1.z.object({ id: zod_1.z.string().min(1) });
const manifest = {
    id: 'bellasos.research',
    name: 'Research',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Research companies, industries and topics; save reports and investment ' +
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
            type: contracts_1.CoreEvents.ResearchCompleted,
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
function createResearchModule() {
    let ctx;
    return {
        manifest,
        async onInstall(c) {
            ctx = c;
        },
        async onEnable(c) {
            ctx = c;
        },
        async onDisable() { },
        async onUninstall() { },
        async handle(action, input, call) {
            switch (action) {
                case 'run': {
                    const { subject, kind } = runInput.parse(input);
                    const ingestion = (0, core_ingestion_1.getIngestionService)();
                    const { promptBlock, sources, fetchedAt } = await ingestion.getContextForQuery(`${kind} ${subject}`, ['research', kind, subject.toLowerCase()]);
                    const completion = await ctx.ai.complete({
                        taskType: 'research',
                        traceId: call.traceId,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a research analyst. Use ONLY the provided live sources below. ' +
                                    'Produce: Overview, Key Facts, Risks, Opportunities, Investment Thesis. ' +
                                    'Cite source titles/URLs inline. If sources are thin, say so explicitly.',
                            },
                            {
                                role: 'user',
                                content: `Research the ${kind}: ${subject}\n\nLive sources (as of ${fetchedAt}):\n${promptBlock}`,
                            },
                        ],
                    });
                    const report = {
                        id: crypto.randomUUID(),
                        subject,
                        kind,
                        content: completion.text,
                        sources,
                        dataAsOf: fetchedAt,
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
                    await ctx.events.publish(contracts_1.CoreEvents.ResearchCompleted, report, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    return report;
                }
                case 'reports.list': {
                    const items = await ctx.storage.list('report:');
                    return items
                        .map((i) => i.value)
                        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
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
//# sourceMappingURL=index.js.map
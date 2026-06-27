"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCodingModule = createCodingModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const task_pipeline_1 = require("./task-pipeline");
const taskExecuteInput = zod_1.z.object({
    goal: zod_1.z.string().min(1),
});
const taskRefineInput = zod_1.z.object({
    prompt: zod_1.z.string().min(1),
    projectId: zod_1.z.string().uuid(),
});
const projectSaveInput = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).optional(),
    goal: zod_1.z.string().optional(),
    html: zod_1.z.string().min(1),
});
const projectGetInput = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
const manifest = {
    id: 'bellasos.coding',
    name: 'Coding Studio',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'End-to-end coding tasks: plan, generate, save, preview, and refine HTML apps and games.',
    permissions: [{ key: 'coding.read', description: 'View coding projects' }],
    actions: [
        { name: 'project.list', description: 'List saved coding projects', permission: 'coding.read' },
        {
            name: 'project.get',
            description: 'Get a coding project by id',
            permission: 'coding.read',
            inputSchema: projectGetInput,
        },
        {
            name: 'project.save',
            description: 'Save or update project HTML',
            permission: 'coding.read',
            inputSchema: projectSaveInput,
        },
        {
            name: 'task.execute',
            description: 'Run full task pipeline: analyze, generate, save, preview-ready',
            permission: 'coding.read',
            inputSchema: taskExecuteInput,
        },
        {
            name: 'task.refine',
            description: 'Edit an existing project with a natural-language prompt',
            permission: 'coding.read',
            inputSchema: taskRefineInput,
        },
    ],
    events: [],
    settings: [],
    widgets: [
        {
            id: 'coding',
            title: 'Coding Studio',
            component: 'CodingWidget',
            defaultSize: 'lg',
            permission: 'coding.read',
            dataAction: 'project.list',
        },
    ],
};
async function listProjects(ctx) {
    const items = await ctx.storage.list('project:');
    return items
        .map((i) => i.value)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
async function getProject(ctx, id) {
    const item = await ctx.storage.get(`project:${id}`);
    if (!item)
        throw new Error('Project not found');
    return item;
}
function createCodingModule() {
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
                case 'project.list':
                    return listProjects(ctx);
                case 'project.get': {
                    const { id } = projectGetInput.parse(input);
                    return getProject(ctx, id);
                }
                case 'project.save': {
                    const body = projectSaveInput.parse(input);
                    const now = new Date().toISOString();
                    const id = body.id ?? crypto.randomUUID();
                    const existing = body.id ? (await ctx.storage.get(`project:${id}`)) : null;
                    const project = {
                        id,
                        title: body.title ?? existing?.title ?? 'Untitled project',
                        goal: body.goal ?? existing?.goal ?? '',
                        html: body.html,
                        createdAt: existing?.createdAt ?? now,
                        updatedAt: now,
                    };
                    await ctx.storage.set(`project:${id}`, project);
                    return project;
                }
                case 'task.execute': {
                    const { goal } = taskExecuteInput.parse(input);
                    const result = await (0, task_pipeline_1.executeCodingTask)(goal, ctx.ai, async (project) => {
                        await ctx.storage.set(`project:${project.id}`, project);
                    });
                    return result;
                }
                case 'task.refine': {
                    const { prompt, projectId } = taskRefineInput.parse(input);
                    const existing = await getProject(ctx, projectId);
                    const result = await (0, task_pipeline_1.refineCodingProject)(prompt, existing, ctx.ai, async (project) => {
                        await ctx.storage.set(`project:${project.id}`, project);
                    });
                    return result;
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
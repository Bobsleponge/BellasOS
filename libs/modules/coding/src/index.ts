import { z } from 'zod';
import {
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import {
  executeCodingTask,
  refineCodingProject,
  type CodingProject,
} from './task-pipeline';

const taskExecuteInput = z.object({
  goal: z.string().min(1),
});

const taskRefineInput = z.object({
  prompt: z.string().min(1),
  projectId: z.string().uuid(),
});

const projectSaveInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).optional(),
  goal: z.string().optional(),
  html: z.string().min(1),
});

const projectGetInput = z.object({
  id: z.string().uuid(),
});

const manifest: ModuleManifest = {
  id: 'bellasos.coding',
  name: 'Coding Studio',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'End-to-end coding tasks: plan, generate, save, preview, and refine HTML apps and games.',
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

async function listProjects(ctx: ModuleContext): Promise<CodingProject[]> {
  const items = await ctx.storage.list('project:');
  return items
    .map((i) => i.value as CodingProject)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getProject(ctx: ModuleContext, id: string): Promise<CodingProject> {
  const item = await ctx.storage.get(`project:${id}`);
  if (!item) throw new Error('Project not found');
  return item as CodingProject;
}

export function createCodingModule(): ModuleRuntime {
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
          const existing = body.id ? ((await ctx.storage.get(`project:${id}`)) as CodingProject | null) : null;
          const project: CodingProject = {
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
          const result = await executeCodingTask(goal, ctx.ai, async (project) => {
            await ctx.storage.set(`project:${project.id}`, project);
          });
          return result;
        }

        case 'task.refine': {
          const { prompt, projectId } = taskRefineInput.parse(input);
          const existing = await getProject(ctx, projectId);
          const result = await refineCodingProject(prompt, existing, ctx.ai, async (project) => {
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

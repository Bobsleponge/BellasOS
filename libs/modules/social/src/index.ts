import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import { fetchPlatformAnalytics, publishToPlatform } from './publish';

const PLATFORMS = [
  'LinkedIn',
  'X',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
] as const;

const draftInput = z.object({
  platform: z.enum(PLATFORMS),
  topic: z.string().min(1),
  tone: z.string().default('professional'),
});

const scheduleInput = z.object({
  draftId: z.string(),
  when: z.string().datetime(),
});

const publishInput = z.object({ draftId: z.string() });

const analyticsInput = z.object({
  platform: z.enum(PLATFORMS).optional(),
});

interface Draft {
  id: string;
  platform: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  publishedAt?: string;
  postId?: string;
  postUrl?: string;
  createdAt: string;
}

const manifest: ModuleManifest = {
  id: 'bellasos.social',
  name: 'Social Media',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Integrate social platforms, draft and schedule content with approval ' +
    'workflows, and track analytics.',
  permissions: [
    { key: 'social.read', description: 'View social content' },
    { key: 'social.draft', description: 'Draft content' },
    { key: 'social.schedule', description: 'Schedule content' },
    { key: 'social.publish', description: 'Publish content' },
    { key: 'social.admin', description: 'Administer integrations' },
  ],
  actions: [
    { name: 'platforms.list', description: 'List supported platforms', permission: 'social.read' },
    { name: 'drafts.list', description: 'List drafts', permission: 'social.read' },
    {
      name: 'draft.create',
      description: 'Draft a post with AI',
      permission: 'social.draft',
      inputSchema: draftInput,
    },
    {
      name: 'schedule',
      description: 'Schedule a draft',
      permission: 'social.schedule',
      inputSchema: scheduleInput,
    },
    {
      name: 'publish',
      description: 'Publish a draft (requires approval)',
      permission: 'social.publish',
      requiresApproval: true,
      inputSchema: publishInput,
    },
    {
      name: 'analytics',
      description: 'Engagement analytics',
      permission: 'social.read',
      inputSchema: analyticsInput,
    },
    {
      name: 'scheduled.publishDue',
      description: 'Publish drafts whose schedule has elapsed (worker)',
      permission: 'social.publish',
    },
  ],
  events: [
    {
      type: CoreEvents.SocialPostCreated,
      direction: 'publish',
      version: 1,
      description: 'Emitted when a post is published',
    },
  ],
  settings: PLATFORMS.map((p) => ({
    key: `token.${p.toLowerCase()}`,
    type: 'secret' as const,
    label: `${p} API token`,
    secret: true,
  })),
  widgets: [
    {
      id: 'social',
      title: 'Social Media',
      component: 'SocialWidget',
      defaultSize: 'md',
      permission: 'social.read',
      dataAction: 'drafts.list',
    },
  ],
};

export function createSocialModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  const loadDrafts = async (): Promise<Draft[]> => {
    const items = await ctx.storage.list('draft:');
    return items.map((i) => i.value as Draft);
  };

  const getToken = async (platform: string): Promise<string | undefined> => {
    return ctx.config.getSecret(`token.${platform.toLowerCase()}`);
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
        case 'platforms.list':
          return PLATFORMS;
        case 'drafts.list':
          return loadDrafts();
        case 'draft.create': {
          const { platform, topic, tone } = draftInput.parse(input);
          const res = await ctx.ai.complete({
            taskType: 'general',
            traceId: call.traceId,
            messages: [
              {
                role: 'system',
                content: `Write a ${tone} ${platform} post. Respect platform norms and length.`,
              },
              { role: 'user', content: topic },
            ],
          });
          const draft: Draft = {
            id: crypto.randomUUID(),
            platform,
            content: res.text,
            status: 'draft',
            createdAt: new Date().toISOString(),
          };
          await ctx.storage.set(`draft:${draft.id}`, draft);
          return draft;
        }
        case 'schedule': {
          const { draftId, when } = scheduleInput.parse(input);
          const draft = (await ctx.storage.get(`draft:${draftId}`)) as Draft | undefined;
          if (!draft) throw new Error('Draft not found');
          draft.status = 'scheduled';
          draft.scheduledFor = when;
          await ctx.storage.set(`draft:${draftId}`, draft);
          return draft;
        }
        case 'publish': {
          const { draftId } = publishInput.parse(input);
          const draft = (await ctx.storage.get(`draft:${draftId}`)) as Draft | undefined;
          if (!draft) throw new Error('Draft not found');
          const token = await getToken(draft.platform);
          if (!token) {
            throw new Error(
              `No token configured for ${draft.platform}. Connect the account in Settings or Social page.`,
            );
          }
          const published = await publishToPlatform(draft.platform, draft.content, token);
          draft.status = 'published';
          draft.publishedAt = new Date().toISOString();
          draft.postId = published.postId;
          draft.postUrl = published.url;
          await ctx.storage.set(`draft:${draftId}`, draft);
          await ctx.events.publish(CoreEvents.SocialPostCreated, draft, {
            traceId: call.traceId,
            actorId: call.principal.id,
          });
          return draft;
        }
        case 'scheduled.publishDue': {
          const now = Date.now();
          const drafts = await loadDrafts();
          const due = drafts.filter(
            (d) =>
              d.status === 'scheduled' &&
              d.scheduledFor &&
              new Date(d.scheduledFor).getTime() <= now,
          );
          const results = [];
          for (const d of due) {
            try {
              const token = await getToken(d.platform);
              if (!token) {
                results.push({ draftId: d.id, error: `No token for ${d.platform}` });
                continue;
              }
              const published = await publishToPlatform(d.platform, d.content, token);
              d.status = 'published';
              d.publishedAt = new Date().toISOString();
              d.postId = published.postId;
              d.postUrl = published.url;
              await ctx.storage.set(`draft:${d.id}`, d);
              await ctx.events.publish(CoreEvents.SocialPostCreated, d, {
                traceId: call.traceId,
                actorId: call.principal.id,
              });
              results.push({ draftId: d.id, published: true, url: d.postUrl });
            } catch (err) {
              results.push({ draftId: d.id, error: (err as Error).message });
            }
          }
          return { processed: results.length, results };
        }
        case 'analytics': {
          const { platform } = analyticsInput.parse(input ?? {});
          const target = platform ?? 'X';
          const token = await getToken(target);
          if (!token) {
            return {
              configured: false,
              platform: target,
              message: `Connect ${target} to view analytics.`,
            };
          }
          const metrics = await fetchPlatformAnalytics(target, token);
          return { configured: true, platform: target, ...metrics };
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

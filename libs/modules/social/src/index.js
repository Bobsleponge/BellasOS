"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocialModule = createSocialModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const publish_1 = require("./publish");
const PLATFORMS = [
    'LinkedIn',
    'X',
    'Instagram',
    'Facebook',
    'YouTube',
    'TikTok',
];
const draftInput = zod_1.z.object({
    platform: zod_1.z.enum(PLATFORMS),
    topic: zod_1.z.string().min(1),
    tone: zod_1.z.string().default('professional'),
});
const scheduleInput = zod_1.z.object({
    draftId: zod_1.z.string(),
    when: zod_1.z.string().datetime(),
});
const publishInput = zod_1.z.object({ draftId: zod_1.z.string() });
const analyticsInput = zod_1.z.object({
    platform: zod_1.z.enum(PLATFORMS).optional(),
});
const manifest = {
    id: 'bellasos.social',
    name: 'Social Media',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Integrate social platforms, draft and schedule content with approval ' +
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
            type: contracts_1.CoreEvents.SocialPostCreated,
            direction: 'publish',
            version: 1,
            description: 'Emitted when a post is published',
        },
    ],
    settings: PLATFORMS.map((p) => ({
        key: `token.${p.toLowerCase()}`,
        type: 'secret',
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
function createSocialModule() {
    let ctx;
    const loadDrafts = async () => {
        const items = await ctx.storage.list('draft:');
        return items.map((i) => i.value);
    };
    const getToken = async (platform) => {
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
        async onDisable() { },
        async onUninstall() { },
        async handle(action, input, call) {
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
                    const draft = {
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
                    const draft = (await ctx.storage.get(`draft:${draftId}`));
                    if (!draft)
                        throw new Error('Draft not found');
                    draft.status = 'scheduled';
                    draft.scheduledFor = when;
                    await ctx.storage.set(`draft:${draftId}`, draft);
                    return draft;
                }
                case 'publish': {
                    const { draftId } = publishInput.parse(input);
                    const draft = (await ctx.storage.get(`draft:${draftId}`));
                    if (!draft)
                        throw new Error('Draft not found');
                    const token = await getToken(draft.platform);
                    if (!token) {
                        throw new Error(`No token configured for ${draft.platform}. Connect the account in Settings or Social page.`);
                    }
                    const published = await (0, publish_1.publishToPlatform)(draft.platform, draft.content, token);
                    draft.status = 'published';
                    draft.publishedAt = new Date().toISOString();
                    draft.postId = published.postId;
                    draft.postUrl = published.url;
                    await ctx.storage.set(`draft:${draftId}`, draft);
                    await ctx.events.publish(contracts_1.CoreEvents.SocialPostCreated, draft, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    return draft;
                }
                case 'scheduled.publishDue': {
                    const now = Date.now();
                    const drafts = await loadDrafts();
                    const due = drafts.filter((d) => d.status === 'scheduled' &&
                        d.scheduledFor &&
                        new Date(d.scheduledFor).getTime() <= now);
                    const results = [];
                    for (const d of due) {
                        try {
                            const token = await getToken(d.platform);
                            if (!token) {
                                results.push({ draftId: d.id, error: `No token for ${d.platform}` });
                                continue;
                            }
                            const published = await (0, publish_1.publishToPlatform)(d.platform, d.content, token);
                            d.status = 'published';
                            d.publishedAt = new Date().toISOString();
                            d.postId = published.postId;
                            d.postUrl = published.url;
                            await ctx.storage.set(`draft:${d.id}`, d);
                            await ctx.events.publish(contracts_1.CoreEvents.SocialPostCreated, d, {
                                traceId: call.traceId,
                                actorId: call.principal.id,
                            });
                            results.push({ draftId: d.id, published: true, url: d.postUrl });
                        }
                        catch (err) {
                            results.push({ draftId: d.id, error: err.message });
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
                    const metrics = await (0, publish_1.fetchPlatformAnalytics)(target, token);
                    return { configured: true, platform: target, ...metrics };
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
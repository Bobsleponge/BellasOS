"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCameraModule = createCameraModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const eventInput = zod_1.z.object({
    camera: zod_1.z.string().default('front'),
    kind: zod_1.z.enum(['motion', 'presence', 'gesture', 'object']).default('motion'),
    detail: zod_1.z.string().optional(),
});
const manifest = {
    id: 'bellasos.camera',
    name: 'Camera',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Presence, gesture, object and motion detection; future AR integration. ' +
        'Publishes vision events to the bus for downstream automation.',
    permissions: [{ key: 'camera.read', description: 'View camera events' }],
    actions: [
        { name: 'events.list', description: 'Recent camera events', permission: 'camera.read' },
        {
            name: 'ingest',
            description: 'Ingest a detection event (from an edge vision pipeline)',
            permission: 'camera.read',
            inputSchema: eventInput,
        },
    ],
    events: [
        {
            type: contracts_1.CoreEvents.CameraMotionDetected,
            direction: 'publish',
            version: 1,
            description: 'Motion/presence/gesture/object detected',
        },
    ],
    settings: [
        { key: 'streamUrl', type: 'string', label: 'Camera stream URL' },
    ],
    widgets: [
        {
            id: 'camera',
            title: 'Camera',
            component: 'CameraWidget',
            defaultSize: 'md',
            permission: 'camera.read',
            dataAction: 'events.list',
        },
    ],
};
function createCameraModule() {
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
                case 'ingest': {
                    const evt = eventInput.parse(input);
                    const record = { ...evt, id: crypto.randomUUID(), at: new Date().toISOString() };
                    await ctx.storage.set(`event:${record.at}:${record.id}`, record);
                    await ctx.events.publish(contracts_1.CoreEvents.CameraMotionDetected, record, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    return record;
                }
                case 'events.list': {
                    const items = await ctx.storage.list('event:');
                    return items
                        .map((i) => i.value)
                        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
                        .slice(0, 20);
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
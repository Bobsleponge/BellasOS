import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';

const eventInput = z.object({
  camera: z.string().default('front'),
  kind: z.enum(['motion', 'presence', 'gesture', 'object']).default('motion'),
  detail: z.string().optional(),
});

const manifest: ModuleManifest = {
  id: 'bellasos.camera',
  name: 'Camera',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Presence, gesture, object and motion detection; future AR integration. ' +
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
      type: CoreEvents.CameraMotionDetected,
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

export function createCameraModule(): ModuleRuntime {
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
        case 'ingest': {
          const evt = eventInput.parse(input);
          const record = { ...evt, id: crypto.randomUUID(), at: new Date().toISOString() };
          await ctx.storage.set(`event:${record.at}:${record.id}`, record);
          await ctx.events.publish(CoreEvents.CameraMotionDetected, record, {
            traceId: call.traceId,
            actorId: call.principal.id,
          });
          return record;
        }
        case 'events.list': {
          const items = await ctx.storage.list('event:');
          return items
            .map((i) => i.value)
            .sort((a, b) =>
              String((b as { at: string }).at).localeCompare(
                String((a as { at: string }).at),
              ),
            )
            .slice(0, 20);
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

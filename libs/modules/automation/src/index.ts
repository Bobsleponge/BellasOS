import { z } from 'zod';
import {
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';

const controlInput = z.object({
  entityId: z.string().min(1),
  action: z.enum(['turn_on', 'turn_off', 'toggle']),
});

interface Device {
  entityId: string;
  name: string;
  domain: string;
  state: string;
}

const manifest: ModuleManifest = {
  id: 'bellasos.automation',
  name: 'Automation',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Integrate Home Assistant and smart devices (lighting, projectors, ' +
    'cameras, speakers); future robotics. Control and automate the space.',
  permissions: [
    { key: 'automation.read', description: 'View devices' },
    { key: 'automation.control', description: 'Control devices' },
  ],
  actions: [
    { name: 'devices.list', description: 'List devices', permission: 'automation.read' },
    {
      name: 'device.control',
      description: 'Control a device',
      permission: 'automation.control',
      inputSchema: controlInput,
    },
    { name: 'status', description: 'Integration status', permission: 'automation.read' },
  ],
  events: [
    {
      type: 'automation.device.changed',
      direction: 'publish',
      version: 1,
      description: 'Emitted when a device state changes',
    },
  ],
  settings: [
    { key: 'hassUrl', type: 'string', label: 'Home Assistant URL' },
    { key: 'hassToken', type: 'secret', label: 'Home Assistant token', secret: true },
  ],
  widgets: [
    {
      id: 'automation',
      title: 'Automation',
      component: 'AutomationWidget',
      defaultSize: 'md',
      permission: 'automation.read',
      dataAction: 'devices.list',
    },
  ],
};

export function createAutomationModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  const configured = async (): Promise<boolean> => {
    const url = await ctx.config.get<string>('hassUrl');
    const token = await ctx.config.getSecret('hassToken');
    return Boolean(url && token);
  };

  const hass = async (path: string, init?: RequestInit) => {
    const url = await ctx.config.get<string>('hassUrl');
    const token = await ctx.config.getSecret('hassToken');
    if (!url || !token) return undefined;
    const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Home Assistant error (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json();
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
    async handle(action: string, input: unknown, _call: CallContext) {
      switch (action) {
        case 'status': {
          const ok = await configured();
          return {
            configured: ok,
            message: ok
              ? 'Home Assistant connected.'
              : 'Configure Home Assistant URL and long-lived token in Settings.',
          };
        }
        case 'devices.list': {
          if (!(await configured())) {
            return [];
          }
          const states = (await hass('/api/states')) as
            | Array<{ entity_id: string; state: string; attributes?: { friendly_name?: string } }>
            | undefined;
          if (!states) return [];
          return states.slice(0, 100).map((s) => ({
            entityId: s.entity_id,
            name: s.attributes?.friendly_name ?? s.entity_id,
            domain: s.entity_id.split('.')[0] ?? 'unknown',
            state: s.state,
          })) satisfies Device[];
        }
        case 'device.control': {
          if (!(await configured())) {
            throw new Error(
              'Home Assistant is not configured. Set hassUrl and hassToken in module settings.',
            );
          }
          const { entityId, action: act } = controlInput.parse(input);
          const domain = entityId.split('.')[0] ?? 'homeassistant';
          await hass(`/api/services/${domain}/${act}`, {
            method: 'POST',
            body: JSON.stringify({ entity_id: entityId }),
          });
          return { entityId, action: act, ok: true };
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

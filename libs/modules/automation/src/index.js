"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAutomationModule = createAutomationModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const controlInput = zod_1.z.object({
    entityId: zod_1.z.string().min(1),
    action: zod_1.z.enum(['turn_on', 'turn_off', 'toggle']),
});
const manifest = {
    id: 'bellasos.automation',
    name: 'Automation',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Integrate Home Assistant and smart devices (lighting, projectors, ' +
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
function createAutomationModule() {
    let ctx;
    const configured = async () => {
        const url = await ctx.config.get('hassUrl');
        const token = await ctx.config.getSecret('hassToken');
        return Boolean(url && token);
    };
    const hass = async (path, init) => {
        const url = await ctx.config.get('hassUrl');
        const token = await ctx.config.getSecret('hassToken');
        if (!url || !token)
            return undefined;
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
        async onDisable() { },
        async onUninstall() { },
        async handle(action, input, _call) {
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
                    const states = (await hass('/api/states'));
                    if (!states)
                        return [];
                    return states.slice(0, 100).map((s) => ({
                        entityId: s.entity_id,
                        name: s.attributes?.friendly_name ?? s.entity_id,
                        domain: s.entity_id.split('.')[0] ?? 'unknown',
                        state: s.state,
                    }));
                }
                case 'device.control': {
                    if (!(await configured())) {
                        throw new Error('Home Assistant is not configured. Set hassUrl and hassToken in module settings.');
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
//# sourceMappingURL=index.js.map
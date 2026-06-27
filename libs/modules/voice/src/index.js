"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoiceModule = createVoiceModule;
const zod_1 = require("zod");
const contracts_1 = require("@bellasos/contracts");
const commandInput = zod_1.z.object({ transcript: zod_1.z.string().min(1) });
const manifest = {
    id: 'bellasos.voice',
    name: 'Voice',
    version: '0.1.0',
    apiVersion: contracts_1.HOST_API_VERSION,
    description: 'Wake word, speech-to-text, text-to-speech, voice commands and ' +
        'conversation mode. The primary Jarvis interface.',
    permissions: [{ key: 'voice.use', description: 'Use voice features' }],
    actions: [
        {
            name: 'command',
            description: 'Process a transcribed voice command',
            permission: 'voice.use',
            inputSchema: commandInput,
        },
        {
            name: 'speak',
            description: 'Synthesize speech (returns text to be spoken by the client)',
            permission: 'voice.use',
            inputSchema: zod_1.z.object({ text: zod_1.z.string() }),
        },
    ],
    events: [
        { type: contracts_1.CoreEvents.UserSpeaking, direction: 'publish', version: 1, description: 'User started speaking' },
        { type: contracts_1.CoreEvents.VoiceCommand, direction: 'publish', version: 1, description: 'A voice command was recognised' },
    ],
    settings: [
        { key: 'wakeWord', type: 'string', label: 'Wake word', default: 'jarvis' },
        { key: 'voice', type: 'string', label: 'TTS voice', default: 'default' },
    ],
    widgets: [
        {
            id: 'voice',
            title: 'Voice',
            component: 'VoiceWidget',
            defaultSize: 'sm',
            permission: 'voice.use',
        },
    ],
};
function createVoiceModule() {
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
                case 'command': {
                    const { transcript } = commandInput.parse(input);
                    await ctx.events.publish(contracts_1.CoreEvents.UserSpeaking, { actorId: call.principal.id }, { traceId: call.traceId });
                    await ctx.events.publish(contracts_1.CoreEvents.VoiceCommand, { transcript }, {
                        traceId: call.traceId,
                        actorId: call.principal.id,
                    });
                    // Interpret the command with the AI gateway (intent + reply).
                    const res = await ctx.ai.complete({
                        taskType: 'general',
                        traceId: call.traceId,
                        messages: [
                            { role: 'system', content: 'You are Jarvis. Reply concisely and helpfully.' },
                            { role: 'user', content: transcript },
                        ],
                    });
                    await ctx.memory.remember({
                        tier: 'short',
                        ownerId: call.principal.id,
                        content: `User: ${transcript}\nJarvis: ${res.text}`,
                    });
                    return { reply: res.text };
                }
                case 'speak': {
                    const { text } = input;
                    return { ssml: text, voice: await ctx.config.get('voice') };
                }
                default:
                    throw new Error(`Unknown action ${action}`);
            }
        },
    };
}
//# sourceMappingURL=index.js.map
import { z } from 'zod';
import {
  CoreEvents,
  HOST_API_VERSION,
  type CallContext,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';

const commandInput = z.object({ transcript: z.string().min(1) });

const manifest: ModuleManifest = {
  id: 'bellasos.voice',
  name: 'Voice',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description:
    'Wake word, speech-to-text, text-to-speech, voice commands and ' +
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
      inputSchema: z.object({ text: z.string() }),
    },
  ],
  events: [
    { type: CoreEvents.UserSpeaking, direction: 'publish', version: 1, description: 'User started speaking' },
    { type: CoreEvents.VoiceCommand, direction: 'publish', version: 1, description: 'A voice command was recognised' },
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

export function createVoiceModule(): ModuleRuntime {
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
        case 'command': {
          const { transcript } = commandInput.parse(input);
          await ctx.events.publish(CoreEvents.UserSpeaking, { actorId: call.principal.id }, { traceId: call.traceId });
          await ctx.events.publish(CoreEvents.VoiceCommand, { transcript }, {
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
          const { text } = (input as { text: string });
          return { ssml: text, voice: await ctx.config.get('voice') };
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}

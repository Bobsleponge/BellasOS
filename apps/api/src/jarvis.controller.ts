import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ok, type CallContext } from '@bellasos/contracts';
import { PLATFORM, type Platform } from './platform.token';
import type { AuthedRequest } from './auth.guard';
import { transcribeWav } from './stt.service';

function callCtx(req: AuthedRequest): CallContext {
  return { principal: req.principal, traceId: req.traceId };
}

interface RouterPlan {
  intent: 'chat' | 'agent' | 'module' | 'open_app';
  agentType?: string;
  moduleId?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  openApp?: string;
  prompt?: string;
  reply?: string;
}

const MODULE_APPS: Record<string, string> = {
  portfolio: 'bellasos.portfolio',
  research: 'bellasos.research',
  intelligence: 'bellasos.intelligence',
  social: 'bellasos.social',
  automation: 'bellasos.automation',
  voice: 'bellasos.voice',
  camera: 'bellasos.camera',
  llm: 'bellasos.llm',
  ai: 'ai.studio',
  console: 'system.console',
};

function extractText(data: unknown): string {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (out && typeof out === 'object') {
    const o = out as Record<string, unknown>;
    for (const key of ['response', 'analysis', 'content', 'reply', 'text', 'result']) {
      const v = o[key];
      if (typeof v === 'string') return v;
    }
    const report = o.report as { content?: string } | undefined;
    if (report?.content) return report.content;
    const briefing = o.briefing as { content?: string } | undefined;
    if (briefing?.content) return briefing.content;
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function parseRouterJson(text: string): RouterPlan | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as RouterPlan;
  } catch {
    return null;
  }
}

@Controller('jarvis')
export class JarvisController {
  constructor(@Inject(PLATFORM) private readonly platform: Platform) {}

  /** Local speech-to-text (Whisper). No Google/cloud browser STT required. */
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(
    @Req() req: AuthedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      return ok({ text: '' }, req.traceId);
    }
    try {
      const text = await transcribeWav(file.buffer);
      return ok({ text }, req.traceId);
    } catch (err) {
      return ok(
        {
          text: '',
          error: (err as Error).message || 'Transcription failed',
        },
        req.traceId,
      );
    }
  }

  @Post('chat')
  async chat(
    @Req() req: AuthedRequest,
    @Body() body: { message: string; sessionId?: string },
  ) {
    const message = body.message?.trim();
    if (!message) {
      return ok({ reply: 'Say something and I will help.', state: 'completed' }, req.traceId);
    }

    const agents = this.platform.orchestrator.listAgents();
    const modules = this.platform.registry.list().map((m) => m.manifest.id);

    const routerPrompt = `You are Jarvis, the BellasOS router. Classify the user message and return ONLY valid JSON (no markdown):
{
  "intent": "chat" | "agent" | "module" | "open_app",
  "agentType": "<one of: ${agents.join(', ')}>",
  "moduleId": "<module id from: ${modules.join(', ')}>",
  "action": "<module action name if intent is module>",
  "actionInput": {},
  "openApp": "<app id: ${Object.values(MODULE_APPS).join(', ')}, system.console, ai.studio>",
  "prompt": "<instruction for agent if intent is agent>",
  "reply": "<short conversational reply if intent is chat or open_app>"
}

Rules:
- "open portfolio", "show research" -> intent open_app with openApp set
- research questions -> intent agent, agentType research, prompt = user message
- briefings -> agent intelligence
- draft/post -> agent social or module bellasos.social draft.create
- general conversation -> intent chat with reply
User: ${message}`;

    let plan: RouterPlan = { intent: 'chat', reply: '' };
    try {
      const routed = await this.platform.ai.complete({
        taskType: 'general',
        traceId: req.traceId,
        messages: [
          { role: 'system', content: 'Return only JSON for routing.' },
          { role: 'user', content: routerPrompt },
        ],
      });
      plan = parseRouterJson(routed.text) ?? { intent: 'chat', reply: routed.text };
    } catch {
      plan = { intent: 'chat', reply: 'I had trouble routing that request. Try again in a moment.' };
    }

    const lower = message.toLowerCase();
    if (lower.includes('open ') || lower.startsWith('show ')) {
      for (const [key, appId] of Object.entries(MODULE_APPS)) {
        if (lower.includes(key)) {
          plan.intent = 'open_app';
          plan.openApp = appId;
          plan.reply = plan.reply || `Opening ${key}.`;
          break;
        }
      }
    }

    if (plan.intent === 'open_app' && plan.openApp) {
      return ok(
        {
          reply: plan.reply ?? `Opening ${plan.openApp}.`,
          state: 'completed',
          openApp: plan.openApp,
          routedTo: { kind: 'module', id: plan.openApp },
        },
        req.traceId,
      );
    }

    if (plan.intent === 'agent' && plan.agentType) {
      try {
        const result = await this.platform.orchestrator.command({
          agentType: plan.agentType,
          prompt: plan.prompt ?? message,
          traceId: req.traceId,
          actorId: req.principal.id,
        });
        return ok(
          {
            reply: extractText(result),
            state: 'completed',
            routedTo: { kind: 'agent', id: plan.agentType },
            openApp: plan.openApp,
          },
          req.traceId,
        );
      } catch (err) {
        return ok(
          {
            reply: `Error: ${(err as Error).message}`,
            state: 'error',
          },
          req.traceId,
        );
      }
    }

    if (plan.intent === 'module' && plan.moduleId && plan.action) {
      try {
        const result = await this.platform.registry.dispatch(
          plan.moduleId,
          plan.action,
          plan.actionInput ?? { prompt: message },
          callCtx(req),
        );
        return ok(
          {
            reply: extractText(result),
            state: 'completed',
            routedTo: { kind: 'module', id: plan.moduleId },
            action: { moduleId: plan.moduleId, action: plan.action, input: plan.actionInput },
            openApp: plan.openApp ?? plan.moduleId,
          },
          req.traceId,
        );
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.toLowerCase().includes('approval')) {
          return ok({ reply: 'That action needs your approval in System Console.', state: 'needs_approval' }, req.traceId);
        }
        return ok({ reply: `Error: ${msg}`, state: 'error' }, req.traceId);
      }
    }

    if (plan.reply) {
      return ok({ reply: plan.reply, state: 'completed' }, req.traceId);
    }

    try {
      const chat = await this.platform.ai.complete({
        taskType: 'general',
        traceId: req.traceId,
        messages: [
          { role: 'system', content: 'You are Jarvis, a concise helpful OS assistant.' },
          { role: 'user', content: message },
        ],
      });
      return ok({ reply: chat.text, state: 'completed' }, req.traceId);
    } catch (err) {
      return ok(
        { reply: `Error: ${(err as Error).message}`, state: 'error' },
        req.traceId,
      );
    }
  }
}